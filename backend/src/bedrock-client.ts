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

    try {
        // 1. Try to find JSON block in markdown
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const cleanText = jsonMatch ? jsonMatch[1] : text;

        // 2. Try standard parse first (performance)
        try {
            return JSON.parse(cleanText);
        } catch (e) {
            // 3. Fallback: Try repairing and parsing
            const repaired = jsonrepair(cleanText);
            return JSON.parse(repaired);
        }
    } catch (err) {
        console.error("JSON extraction/repair failed:", err);

        // 4. Last resort: Try to find anything between { } or [ ]
        try {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            const firstBracket = text.indexOf('[');
            const lastBracket = text.lastIndexOf(']');

            let substring = "";
            if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
                substring = text.substring(firstBrace, lastBrace + 1);
            } else if (firstBracket !== -1) {
                substring = text.substring(firstBracket, lastBracket + 1);
            }

            if (substring) {
                const repaired = jsonrepair(substring);
                return JSON.parse(repaired);
            }
        } catch (innerErr) {
            console.error("Deep rescue JSON repair failed:", innerErr);
        }

        return null;
    }
}
