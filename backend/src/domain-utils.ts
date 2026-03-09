import { callBedrockConverse, extractJson, MISTRAL_LARGE_MODEL } from './bedrock-client';
import { DomainInfo, ProjectContextMap } from './types';
import * as CostTracker from './cost-tracker';

const MODEL_ID = MISTRAL_LARGE_MODEL;

/**
 * Detects project domain using a 3-level hierarchy: Domain -> Subdomain -> Specialization.
 */
export async function detectDomain(
    contextMap: ProjectContextMap,
    analysisId: string,
    codeContext?: string,
    projectReview?: any,
    intelligenceReport?: any
): Promise<DomainInfo> {
    const prompt = `You are a Principal Engineer and Technical Interviewer. 
Your task is to classify a software project into a 3-level hierarchy for targeted interview calibration.

PROJECT CONTEXT:
${projectReview?.employabilitySignal?.justification || 'N/A'}
${intelligenceReport?.systemArchitecture?.overview || 'N/A'}

TECHNOLOGY STACK:
${JSON.stringify(contextMap.frameworks || [])}
${JSON.stringify(intelligenceReport?.systemArchitecture?.technologyStack?.libraries || {})}

CORE FILES:
${(contextMap.userCodeFiles || []).slice(0, 50).join('\n')}

${codeContext ? `CODE SNIPPETS:\n${codeContext.substring(0, 8000)}` : ''}

INSTRUCTIONS:
Classify the project into exactly THREE levels:
1. PRIMARY_DOMAIN: The high-level industry or technical field.
2. SUB_DOMAIN: The specific technical branch or domain track.
3. SPECIALIZATION: The precise application, framework focus, or specialized engineering area.

DOMAIN REFERENCE CATEGORIES (Prioritize these high-level areas):
- Core Software Engineering (Backend, Frontend, Full-Stack, etc.)
- Artificial Intelligence & Data Science
- Infrastructure, Cloud, & DevOps
- Cybersecurity & Systems Engineering
- Specialized Domains (Robotics, Blockchain, IoT, etc.)

Return ONLY valid JSON:
{
  "primary_domain": "string",
  "sub_domain": "string",
  "specialization": "string",
  "tags": ["string", "string"],
  "confidence": 0.95,
  "evidence": {
    "keywords": ["string"],
    "files": ["string"],
    "dependencies": ["string"]
  },
  "reasoning": "Brief explanation of the 3-level classification."
}

IMPORTANT: Select domains that most accurately reflect the project's actual implementation and complexity. Prioritize the hierarchical domain context but ensure all visible technical aspects are considered.`;

    try {
        const { text: content, inputTokens, outputTokens, inferenceTimeMs } = await callBedrockConverse(
            prompt,
            MODEL_ID,
            { temperature: 0.1, maxTokens: 1000 }
        );

        await CostTracker.trackAiCall({
            analysisId,
            stage: 'repo_processing',
            modelId: MODEL_ID,
            inputTokens,
            outputTokens,
            inferenceTimeMs,
            promptLength: prompt.length,
            responseLength: content.length
        });

        const parsed = extractJson(content);
        if (!parsed) throw new Error('Failed to parse domain detection JSON');

        return parsed as DomainInfo;
    } catch (err) {
        console.error('Failed to detect domain:', err);
        return {
            primary_domain: 'Software Engineering',
            sub_domain: 'General Development',
            specialization: 'Full-Stack Application',
            tags: [],
            confidence: 0.5,
            evidence: { keywords: [], files: [], dependencies: [] },
            reasoning: 'Fallback due to detection error.'
        };
    }
}
