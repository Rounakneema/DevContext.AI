import {
    BedrockRuntimeClient,
    ConverseCommand
} from "@aws-sdk/client-bedrock-runtime";
import { jsonrepair } from 'jsonrepair';

export const MISTRAL_LARGE_MODEL = "mistral.mistral-large-3-675b-instruct";

/**
 * Bedrock Converse API Client
 * Optimized for Mistral Large 3
 */
export async function callBedrockConverse(
    prompt: string,
    modelId: string = MISTRAL_LARGE_MODEL,
    options: { temperature?: number; maxTokens?: number } = {}
) {
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
            temperature: options.temperature ?? 1,
            maxTokens: options.maxTokens ?? 4096
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
        const usage = response.usage;

        return {
            text: outputText,
            latency,
            inputTokens: usage?.inputTokens || 0,
            outputTokens: usage?.outputTokens || 0,
            inferenceTimeMs: latency
        };
    } catch (err: any) {
        console.error("Bedrock API Error:", err.message);
        return {
            text: "",
            latency: Date.now() - start,
            inputTokens: 0,
            outputTokens: 0,
            inferenceTimeMs: Date.now() - start
        };
    }
}

/**
 * Robustly extract JSON from model output
 * Handles:
 * - Markdown code blocks (```json ... ```)
 * - Text before/after JSON
 * - Truncated or malformed JSON (via jsonrepair)
 */
export function extractJson(text: string): any {
    if (!text) return null;

    // Remove any potential non-printable characters or whitespace at the beginning/end
    const cleanedText = text.trim();

    try {
        // 1. Try to find JSON block in markdown
        const jsonMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const codeBlockText = jsonMatch ? jsonMatch[1].trim() : cleanedText;

        // 2. Try standard parse first (performance)
        try {
            return JSON.parse(codeBlockText);
        } catch (e) {
            // 3. Fallback: Try repairing and parsing
            const repaired = jsonrepair(codeBlockText);
            return JSON.parse(repaired);
        }
    } catch (err) {
        console.error("JSON extraction/repair failed, attempting deep rescue...");

        // 4. Try to find anything between { } or [ ]
        try {
            const firstBrace = cleanedText.indexOf('{');
            const lastBrace = cleanedText.lastIndexOf('}');
            const firstBracket = cleanedText.indexOf('[');
            const lastBracket = cleanedText.lastIndexOf(']');

            let candidate = "";
            let isObject = false;

            if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
                candidate = cleanedText.substring(firstBrace, lastBrace + 1);
                isObject = true;
            } else if (firstBracket !== -1) {
                candidate = cleanedText.substring(firstBracket, lastBracket + 1);
            }

            if (candidate) {
                try {
                    const repaired = jsonrepair(candidate);
                    return JSON.parse(repaired);
                } catch (rescueErr) {
                    console.error("Deep rescue jsonrepair failed, trying substring match...");

                    // 5. Final effort: if it's truncated, try to close it manually
                    if (candidate.startsWith('[') && !candidate.endsWith(']')) {
                        try { return JSON.parse(jsonrepair(candidate + ']')); } catch (e) { }
                    }
                    if (candidate.startsWith('{') && !candidate.endsWith('}')) {
                        try { return JSON.parse(jsonrepair(candidate + '}')); } catch (e) { }
                    }
                }
            }
        } catch (innerErr) {
            console.error("Deep rescue JSON repair failed:", innerErr);
        }

        return null;
    }
}
