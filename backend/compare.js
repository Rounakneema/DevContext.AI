import fetch from "node-fetch";
import {
    BedrockRuntimeClient,
    ConverseCommand
} from "@aws-sdk/client-bedrock-runtime";
import fs from "fs";

// ===============================
// CONFIG
// ===============================
const REPO_URL = "https://github.com/Rounakneema/Revealr";
const MODEL_ID_LARGE = "mistral.mistral-large-3-675b-instruct";
const MODEL_ID_DEVSTRAL = "mistral.devstral-2-123b";

// ===============================
// GITHUB TREE EXTRACTOR
// ===============================
async function fetchRepositoryTree(owner, repo) {
    const headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "AI-Evaluator"
    };

    const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
        { headers }
    );

    if (!res.ok) {
        throw new Error(`GitHub API Error: ${res.status}`);
    }

    const data = await res.json();

    return data.tree
        .filter(item => item.type === "blob")
        .map(item => item.path);
}

function parseGitHubUrl(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (!match) throw new Error("Invalid GitHub URL");
    return { owner: match[1], repo: match[2] };
}

// ===============================
// PROMPT BUILDER
// ===============================
function buildPrompt(fileTree, repoText) {
    return `
You are a Principal Software Engineer at a FAANG company conducting a comprehensive code review for hiring purposes.

You MUST analyze ONLY the provided repository file tree and README content.

DO NOT assume frameworks.
DO NOT fabricate file paths.
DO NOT reference files not present in the file tree.
If insufficient information exists, explicitly state that.

══════════════════════════════════════════
REPOSITORY FILE TREE
══════════════════════════════════════════
${fileTree.slice(0, 300).join("\\n")}

══════════════════════════════════════════
README CONTENT
══════════════════════════════════════════
${repoText}

══════════════════════════════════════════
RESPONSE FORMAT (STRICT JSON — NO TEXT OUTSIDE JSON)
══════════════════════════════════════════

{
  "codeQuality": {
    "overall": number,
    "readability": number,
    "maintainability": number,
    "testCoverage": number,
    "documentation": number,
    "errorHandling": number,
    "security": number,
    "performance": number,
    "bestPractices": number,
    "justification": string
  },
  "architectureClarity": {
    "score": number,
    "componentOrganization": string,
    "separationOfConcerns": string,
    "designPatterns": [],
    "antiPatterns": []
  },
  "employabilitySignal": {
    "overall": number,
    "productionReadiness": number,
    "professionalStandards": number,
    "complexity": string,
    "companyTierMatch": {
      "bigTech": number,
      "productCompanies": number,
      "startups": number,
      "serviceCompanies": number
    },
    "justification": string
  },
  "strengths": [],
  "weaknesses": [],
  "criticalIssues": [],
  "improvementAreas": [],
  "projectAuthenticity": {
    "score": number,
    "confidence": string,
    "signals": {},
    "warnings": [],
    "assessment": string
  },
  "modelMetadata": {
    "modelId": string,
    "tokensIn": number,
    "tokensOut": number,
    "inferenceTimeMs": number,
    "temperature": number
  },
  "generatedAt": string
}

CRITICAL RULES:
1. Only reference files present in the provided file tree.
2. If a file is not listed, DO NOT reference it.
3. Do not invent frameworks or architecture.
4. Output must be raw valid JSON only.
`;
}

// ===============================
// FETCH REPO README (Lightweight)
// ===============================
async function fetchRepoText() {
    const rawUrl =
        "https://raw.githubusercontent.com/Rounakneema/Revealr/main/README.md";

    try {
        const res = await fetch(rawUrl);
        if (!res.ok) throw new Error("No README found");
        return await res.text();
    } catch {
        return "No README available.";
    }
}

// ===============================
// JSON EXTRACTION
// ===============================
function extractJson(text) {
    if (!text) return "";

    // Attempt basic regex cleanup first
    let cleaned = text.replace(/^```json\s*/im, '').replace(/```\s*$/im, '').trim();

    // If it still has trailing backticks, remove them
    cleaned = cleaned.replace(/```+/g, '').trim();

    // Attempt to find the first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return cleaned;
}

// ===============================
// GEMINI CALL
// ===============================
async function callGemini(prompt) {
    const start = Date.now();

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 8192
                }
            })
        }
    );

    const data = await res.json();
    const latency = Date.now() - start;

    if (data.error) {
        console.error("Gemini API Error:", data.error);
        return { raw: "", latency, usage: {} };
    }

    let output = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    output = extractJson(output);

    return {
        raw: output,
        latency,
        usage: data.usageMetadata || {}
    };
}

// ===============================
// BEDROCK CONVERSE: MISTRAL
// ===============================
async function callBedrockConverse(prompt, modelId) {
    const client = new BedrockRuntimeClient({
        region: "us-west-2"
    });

    const start = Date.now();

    const command = new ConverseCommand({
        modelId: modelId,
        messages: [{
            role: "user",
            content: [{ text: prompt }]
        }],
        inferenceConfig: {
            temperature: 1
        },
        additionalModelRequestFields: {
            top_k: null
        },
        performanceConfig: {
            latency: "standard"
        }
    });

    try {
        const response = await client.send(command);
        const latency = Date.now() - start;

        const outputText = response.output?.message?.content?.[0]?.text || "";
        const outputJSON = extractJson(outputText);

        return { raw: outputJSON || outputText, latency };
    } catch (err) {
        console.error("Bedrock API Error:", err.message);
        return { raw: "", latency: Date.now() - start };
    }
}

// ===============================
// JSON VALIDATION
// ===============================
function validateJSON(text) {
    if (!text) return false;
    try {
        JSON.parse(text);
        return true;
    } catch (err) {
        console.error("JSON parse error on first 100 chars:", text.substring(0, 100), "...");
        return false;
    }
}

// ===============================
// MAIN EXECUTION
// ===============================
(async () => {
    console.log("Fetching repository...");

    const { owner, repo } = parseGitHubUrl(REPO_URL);

    const fileTree = await fetchRepositoryTree(owner, repo);
    const repoText = await fetchRepoText();

    const prompt = buildPrompt(fileTree, repoText);

    console.log("Calling Mistral Large 3 via Bedrock Converse API...");
    const mistralLarge = await callBedrockConverse(prompt, MODEL_ID_LARGE);

    console.log("Calling Devstral 2 123B via Bedrock Converse API...");
    const devstral = await callBedrockConverse(prompt, MODEL_ID_DEVSTRAL);

    const mistralLargeValid = validateJSON(mistralLarge.raw);
    const devstralValid = validateJSON(devstral.raw);

    fs.writeFileSync("mistral-large-output.json", mistralLarge.raw);
    fs.writeFileSync("devstral-output.json", devstral.raw);

    console.log("\n═══════════════════════════════");
    console.log("MODEL RESULTS");
    console.log("═══════════════════════════════");

    console.log("\nMistral Large 3");
    console.log("Latency:", mistralLarge.latency, "ms");
    console.log("Valid JSON:", mistralLargeValid);

    console.log("\nDevstral 2 123B");
    console.log("Latency:", devstral.latency, "ms");
    console.log("Valid JSON:", devstralValid);

    console.log("\nOutputs saved to:");
    console.log(" - mistral-large-output.json");
    console.log(" - devstral-output.json");
})();