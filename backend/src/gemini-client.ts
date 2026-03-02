/**
 * DevContext AI — Google Gemini Client
 *
 * Model: gemini-3.1-pro
 * Rate limits (free / standard tier):
 *   RPM  : 25   (requests per minute)
 *   TPM  : 1,000,000 (tokens per minute)
 *   RPD  : 250  (requests per day)
 *
 * With 4 Lambda stages per analysis + answer-eval calls, budget is ~50–60 full
 * analyses per day before hitting RPD. Retry with backoff on 429.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY!;

// ─── Model selection ──────────────────────────────────────────────────────────
// Use Gemini 3.1 Pro for deep code understanding and nuanced scoring.
// Fall back to gemini-2.0-flash only if an explicit GEMINI_USE_FLASH=true env is set
// (useful in dev/test to save RPD quota).
export const GEMINI_MODEL = process.env.GEMINI_USE_FLASH === 'true'
    ? 'gemini-2.0-flash'
    : 'gemini-3.1-pro';

// ─── Rate-limit constants ─────────────────────────────────────────────────────
const MAX_RPM = 25;           // hard ceiling
const MIN_MS_BETWEEN_CALLS = Math.ceil(60_000 / MAX_RPM); // 2 400 ms between calls
const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 3_000;

// ─── Module-level singleton ───────────────────────────────────────────────────
let _client: GoogleGenerativeAI | null = null;
let _model: GenerativeModel | null = null;
let _lastCallTs = 0;

function getModel(): GenerativeModel {
    if (!_model) {
        if (!API_KEY) throw new Error('GEMINI_API_KEY environment variable is not set');
        _client = new GoogleGenerativeAI(API_KEY);
        _model = _client.getGenerativeModel({ model: GEMINI_MODEL });
    }
    return _model;
}

// ─── Rate-limiter (in-Lambda, single-threaded — adequate for one invocation) ──
async function enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - _lastCallTs;
    if (elapsed < MIN_MS_BETWEEN_CALLS) {
        await sleep(MIN_MS_BETWEEN_CALLS - elapsed);
    }
    _lastCallTs = Date.now();
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isRateLimitError(err: any): boolean {
    const msg = String(err?.message || '').toLowerCase();
    const status = err?.status ?? err?.code;
    return status === 429 || msg.includes('quota') || msg.includes('rate limit') || msg.includes('resource_exhausted');
}

// ─── Core API call with retry + backoff ───────────────────────────────────────
/**
 * Send a single text prompt to Gemini 3.1 Pro and return the text.
 * Retries up to MAX_RETRIES times on 429 / quota errors with exponential backoff.
 */
export async function callGemini(
    prompt: string,
    options: {
        temperature?: number;
        maxOutputTokens?: number;
    } = {}
): Promise<{ text: string; inputTokens: number; outputTokens: number; inferenceTimeMs: number }> {
    const model = getModel();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            await enforceRateLimit();

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
            const usage = (result.response as any).usageMetadata;

            return {
                text,
                inputTokens: usage?.promptTokenCount ?? 0,
                outputTokens: usage?.candidatesTokenCount ?? 0,
                inferenceTimeMs,
            };
        } catch (err: any) {
            const isLast = attempt === MAX_RETRIES;

            if (isRateLimitError(err) && !isLast) {
                const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * 1000;
                console.warn(`Gemini rate-limited (attempt ${attempt + 1}). Retrying in ${Math.round(backoff)}ms…`);
                await sleep(backoff);
                continue;
            }

            console.error(`Gemini call failed (attempt ${attempt + 1}):`, err?.message ?? err);
            throw err;
        }
    }

    throw new Error('Gemini: exceeded maximum retry attempts');
}

// ─── JSON extraction (handles markdown fences + embedded objects) ─────────────
/**
 * Extract and parse JSON from a Gemini response.
 * Handles: ```json fences, plain JSON, objects embedded in prose.
 */
export function extractJson(text: string): any {
    // Strip markdown code fences
    const stripped = text
        .replace(/^```json\s*/im, '')
        .replace(/^```\s*/im, '')
        .replace(/```\s*$/im, '')
        .trim();

    // Direct parse
    try { return JSON.parse(stripped); } catch { /* fall through */ }

    // First {...} or [...] block
    const objMatch = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objMatch) {
        try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
    }

    throw new Error(
        `Could not extract JSON from Gemini response.\nSnippet: ${text.substring(0, 300)}`
    );
}
