/**
 * useWebSocket — DevContext AI real-time updates
 *
 * Connects to the API Gateway WebSocket endpoint, authenticates with the
 * Cognito JWT, and subscribes to progress updates for a given analysisId.
 *
 * Designed to complement (not replace) HTTP polling: if WS is unavailable
 * (no endpoint configured, network error, etc.) polling continues silently.
 *
 * Protocol: docs/websocket-protocol.md
 */

import { useEffect, useRef, useCallback } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

// ── Types matching websocket-protocol.md ─────────────────────────────────────

export interface WsProgressPayload {
    analysisId: string;
    status?: string;
    currentStage?: string;
    completedStages?: string[];
    progress?: number;
}

export interface WsStageCompletePayload {
    analysisId: string;
    stage: string;
    workflowState?: string;
    data?: Record<string, unknown>;
}

export interface WsErrorPayload {
    analysisId?: string;
    error: string;
    message: string;
    stage?: string;
}

export interface UseWebSocketCallbacks {
    onProgress?: (payload: WsProgressPayload) => void;
    onStageComplete?: (payload: WsStageCompletePayload) => void;
    onAnalysisComplete?: (payload: { analysisId: string; completedAt: string }) => void;
    onError?: (payload: WsErrorPayload) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
}

// ── Config ───────────────────────────────────────────────────────────────────

const WS_ENDPOINT =
    process.env.REACT_APP_WEBSOCKET_URL ||
    process.env.REACT_APP_WS_ENDPOINT ||
    '';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 1000;

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWebSocket(
    analysisId: string | null | undefined,
    callbacks: UseWebSocketCallbacks
) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
    const mounted = useRef(true);

    // Keep callbacks ref-stable so the connect closure doesn't go stale
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    const connect = useCallback(async () => {
        if (!WS_ENDPOINT || !analysisId) return;
        if (!mounted.current) return;

        // Clean up any existing socket
        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }

        // Get Cognito JWT
        let token = '';
        try {
            const session = await fetchAuthSession();
            token = session.tokens?.idToken?.toString() || '';
        } catch {
            console.warn('[WS] Could not retrieve auth token — connecting anonymously');
        }

        const url = `${WS_ENDPOINT}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

        let ws: WebSocket;
        try {
            ws = new WebSocket(url);
        } catch (err) {
            console.warn('[WS] WebSocket construction failed:', err);
            return;
        }

        wsRef.current = ws;
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            if (!mounted.current) { ws.close(); return; }
            console.log('[WS] Connected');
            reconnectAttempts.current = 0;
            callbacksRef.current.onConnected?.();

            // Subscribe to this analysis
            ws.send(JSON.stringify({ action: 'subscribe', analysisId }));
        };

        ws.onmessage = (event) => {
            if (!mounted.current) return;
            try {
                const msg = JSON.parse(
                    typeof event.data === 'string'
                        ? event.data
                        : new TextDecoder().decode(event.data as ArrayBuffer)
                );

                switch (msg.type) {
                    case 'connected':
                    case 'subscribed':
                        break; // ACKs — no action needed

                    case 'progress':
                        callbacksRef.current.onProgress?.(msg.payload);
                        break;

                    case 'stageComplete':
                        callbacksRef.current.onStageComplete?.(msg.payload);
                        break;

                    case 'analysisComplete':
                        callbacksRef.current.onAnalysisComplete?.(msg.payload);
                        break;

                    case 'error':
                        callbacksRef.current.onError?.(msg.payload);
                        break;

                    case 'pong':
                        break; // heartbeat response

                    default:
                        console.debug('[WS] Unknown message type:', msg.type);
                }
            } catch (err) {
                console.error('[WS] Failed to parse message:', err);
            }
        };

        ws.onerror = (err) => {
            console.warn('[WS] Error:', err);
        };

        ws.onclose = (event) => {
            if (!mounted.current) return;
            console.log(`[WS] Disconnected (code=${event.code})`);
            callbacksRef.current.onDisconnected?.();

            // Reconnect with exponential backoff (don't reconnect on clean close 1000)
            if (
                event.code !== 1000 &&
                reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
            ) {
                const delay = Math.min(
                    BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts.current),
                    30_000
                );
                reconnectAttempts.current++;
                console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
                reconnectTimer.current = setTimeout(connect, delay);
            }
        };
    }, [analysisId]);

    // Heartbeat — send ping every 30s to keep the connection alive
    useEffect(() => {
        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ action: 'ping' }));
            }
        }, 30_000);
        return () => clearInterval(pingInterval);
    }, []);

    // Connect when analysisId becomes available, disconnect on unmount
    useEffect(() => {
        mounted.current = true;
        connect();

        return () => {
            mounted.current = false;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // suppress auto-reconnect
                wsRef.current.close(1000, 'Component unmounted');
                wsRef.current = null;
            }
        };
    }, [connect]);

    // Expose a manual send helper (e.g. for unsubscribe)
    const send = useCallback((data: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    return { send };
}
