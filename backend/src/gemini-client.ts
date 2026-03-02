/**
 * Shared Google Gemini Client
 * Replaces Amazon Bedrock for all AI inference.
 * Model: gemini-2.0-flash (fast, 1M context, cost-efficient)
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Use environment variable — never hardcode
const API_KEY = process.env.GEMINI_API_KEY!;

// Primary model: Gemini 2.0 Flash — best speed/quality/cost for our use case
export const GEMINI_MODEL = 'gemini-2.0-flash';

let _client: GoogleGenerativeAI | null = null;
let _model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
    if (!_model) {
        if (!API_KEY) throw new Error('GEMINI_API_KEY environment variable is not set');
        _client = new GoogleGenerativeAI(API_KEY);
        _model = _client.getGenerativeModel({ model: GEMINI_MODEL });
    }
    return _model;
}

/**
 * Send a single text prompt to Gemini and return the text response.
 * Drop-in replacement for Bedrock ConverseCommand.
 */
export async function callGemini(
    prompt: string,
    options: {
        temperature?: number;
        maxOutputTokens?: number;
    } = {}
): Promise<{ text: string; inputTokens: number; outputTokens: number; inferenceTimeMs: number }> {
    const model = getModel();

    const start = Date.now();

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: options.temperature ?? 0.3,
            maxOutputTokens: options.maxOutputTokens ?? 8192,
        },
    });

    const inferenceTimeMs = Date.now() - start;
    const text = result.response.text();

    // Gemini SDK v0.21+ exposes usageMetadata
    const usage = (result.response as any).usageMetadata;
    const inputTokens = usage?.promptTokenCount ?? 0;
    const outputTokens = usage?.candidatesTokenCount ?? 0;

    return { text, inputTokens, outputTokens, inferenceTimeMs };
}

/**
 * Robust JSON extraction from Gemini response text.
 * Handles ```json fences, plain JSON, or objects embedded in prose.
 */
export function extractJson(text: string): any {
    // Strip markdown code fences
    const stripped = text
        .replace(/^```json\s*/im, '')
        .replace(/^```\s*/im, '')
        .replace(/```\s*$/im, '')
        .trim();

    // Try direct parse
    try {
        return JSON.parse(stripped);
    } catch { /* fall through */ }

    // Find first {...} or [...] block
    const objMatch = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objMatch) {
        try {
            return JSON.parse(objMatch[0]);
        } catch { /* fall through */ }
    }

    throw new Error(`Could not extract JSON from Gemini response. Snippet: ${text.substring(0, 200)}`);
}
