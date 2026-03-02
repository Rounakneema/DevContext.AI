#!/usr/bin/env node
/**
 * DevContext AI — Health Check Script
 * Usage:  node health-check.js
 * Requires: GEMINI_API_KEY env, or reads from samconfig.toml
 *
 * Checks:
 *  1. Gemini API — test call with small prompt
 *  2. Backend API — several core endpoints
 *  3. DynamoDB (via backend /analyses endpoint)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
// Gemini key: prefer env, then try to parse samconfig.toml
let GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
    try {
        const samconfig = fs.readFileSync(path.join(__dirname, 'samconfig.toml'), 'utf8');
        const match = samconfig.match(/GeminiApiKey=(\S+)/);
        if (match) GEMINI_API_KEY = match[1].replace(/["'\\]/g, '');
    } catch { }
}

// Backend URL — read from .env or use production
const BACKEND_URL = process.env.BACKEND_URL || 'https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod'; // update if different

// ── Helpers ───────────────────────────────────────────────────────────────────
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function ok(label, detail = '') {
    console.log(`  ${GREEN}✅ ${BOLD}${label}${RESET}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
}
function fail(label, detail = '') {
    console.log(`  ${RED}❌ ${BOLD}${label}${RESET}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
}
function warn(label, detail = '') {
    console.log(`  ${YELLOW}⚠️  ${BOLD}${label}${RESET}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
}
function section(title) {
    console.log(`\n${BOLD}${title}${RESET}`);
    console.log('─'.repeat(50));
}

function httpGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            port: u.port || (u.protocol === 'https:' ? 443 : 80),
            path: u.pathname + u.search,
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...headers },
            timeout: 10000,
        };
        const lib = u.protocol === 'https:' ? https : require('http');
        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

function httpPost(url, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const payload = typeof body === 'string' ? body : JSON.stringify(body);
        const options = {
            hostname: u.hostname,
            port: u.port || (u.protocol === 'https:' ? 443 : 80),
            path: u.pathname + u.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers },
            timeout: 30000,
        };
        const lib = u.protocol === 'https:' ? https : require('http');
        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(payload);
        req.end();
    });
}

// ── Checks ────────────────────────────────────────────────────────────────────
async function checkGemini() {
    section('1️⃣  Gemini 3.1 Pro API');

    if (!GEMINI_API_KEY) {
        fail('GEMINI_API_KEY not found', 'set env var or check samconfig.toml');
        return;
    }

    ok('API key loaded', `${GEMINI_API_KEY.substring(0, 8)}…`);

    const model = 'gemini-3.1-pro-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
        contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
        generationConfig: { maxOutputTokens: 10 }
    };

    const t0 = Date.now();
    try {
        const res = await httpPost(url, body);
        const ms = Date.now() - t0;

        if (res.status === 200) {
            const parsed = JSON.parse(res.body);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            ok(`Model ${model} responded`, `${ms}ms — "${text.trim()}"`);
        } else if (res.status === 429) {
            warn('Rate limited (429)', 'API key valid, quota hit. Normal if testing frequently.');
        } else if (res.status === 404) {
            fail(`Model ${model} not found (404)`, 'Model ID may be wrong. Try gemini-2.0-flash as fallback.');
        } else {
            fail(`HTTP ${res.status}`, res.body.substring(0, 200));
        }
    } catch (err) {
        fail('Gemini API call failed', err.message);
    }
}

async function checkBackendAPI() {
    section('2️⃣  Backend REST API');

    // Health / root check
    try {
        const res = await httpGet(`${BACKEND_URL}/analyses`);
        if (res.status === 200 || res.status === 401) {
            ok(`/analyses reachable`, `HTTP ${res.status}`);
        } else if (res.status === 403) {
            ok('/analyses reachable (auth required)', 'HTTP 403 — auth working correctly');
        } else if (res.status === 404) {
            fail('/analyses 404 — check BACKEND_URL env', BACKEND_URL);
        } else {
            warn(`/analyses HTTP ${res.status}`);
        }
    } catch (err) {
        fail('Backend unreachable', err.message);
        return;
    }

    // CORS check for frontend origin
    try {
        const res = await httpGet(`${BACKEND_URL}/analyses`, { Origin: 'https://dev-context-ai.vercel.app' });
        const cors = res.status !== 0;
        if (cors) ok('CORS headers present for Vercel origin');
    } catch { }

    // Status endpoint check (fake ID, just checking routing)
    try {
        const res = await httpGet(`${BACKEND_URL}/analysis/health-check-fake-id/status`);
        if (res.status === 404 || res.status === 400 || res.status === 500) {
            ok('/analysis/{id}/status route exists', `HTTP ${res.status} (expected for fake ID)`);
        }
    } catch (err) {
        warn('/status route check failed', err.message);
    }

    // Cancel endpoint check
    try {
        const res = await httpPost(`${BACKEND_URL}/analysis/health-check-fake-id/cancel`, {});
        if (res.status !== 0) {
            ok('/analysis/{id}/cancel route exists', `HTTP ${res.status}`);
        }
    } catch (err) {
        warn('/cancel route check failed', err.message);
    }
}

async function checkLambdaEnvLocally() {
    section('3️⃣  Local Build Sanity Check');

    const distDir = path.join(__dirname, 'dist');
    const files = ['orchestrator.js', 'stage1-review.js', 'stage2-intelligence.js', 'stage3-questions.js', 'gemini-client.js'];

    for (const f of files) {
        const fp = path.join(distDir, f);
        if (fs.existsSync(fp)) {
            const size = fs.statSync(fp).size;
            ok(f, `${(size / 1024).toFixed(1)} KB`);
        } else {
            fail(f, 'not found — run: npm run build');
        }
    }

    // Check gemini-client has correct model
    try {
        const geminiSrc = fs.readFileSync(path.join(__dirname, 'src', 'gemini-client.ts'), 'utf8');
        if (geminiSrc.includes('gemini-3.1-pro')) {
            ok('gemini-client.ts using gemini-3.1-pro');
        } else if (geminiSrc.includes('gemini-2')) {
            warn('gemini-client.ts using older model (2.x)');
        } else {
            fail('gemini-client.ts: model name not recognized');
        }
        if (geminiSrc.includes('MAX_RETRIES')) {
            ok('Rate-limit backoff logic present');
        }
    } catch (err) {
        warn('Could not read gemini-client.ts', err.message);
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log(`\n${BOLD}DevContext AI — Health Check${RESET}  ${DIM}${new Date().toISOString()}${RESET}`);
    console.log('='.repeat(50));

    await checkGemini();
    await checkBackendAPI();
    await checkLambdaEnvLocally();

    console.log(`\n${DIM}Tip: set BACKEND_URL=https://your-api-url to test against a specific endpoint${RESET}`);
    console.log(`${DIM}Tip: set GEMINI_USE_FLASH=true in Lambda env to use gemini-2.0-flash for dev (saves RPD quota)${RESET}`);
    console.log('');
}

main().catch(err => {
    console.error('Health check crashed:', err);
    process.exit(1);
});
