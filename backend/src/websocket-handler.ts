/**
 * WebSocket Handler — Real-time progress push to frontend
 *
 * Routes:
 *  $connect    — Validate JWT (via query param), store connection
 *  $disconnect — Remove connection record
 *  subscribe   — Link connectionId to an analysisId for progress updates
 *
 * Outbound push (called by stage Lambdas):
 *  sendProgressUpdate(analysisId, type, payload)
 *
 * Protocol: docs/websocket-protocol.md
 */

import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    PutCommand,
    DeleteCommand,
    QueryCommand,
    GetCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME || process.env.MAIN_TABLE || 'devcontext-main';
const WS_ENDPOINT = process.env.WS_ENDPOINT || ''; // set by template.yaml

// ── Key helpers ──────────────────────────────────────────────────────────────

function connectionPK(connectionId: string) {
    return `WS_CONN#${connectionId}`;
}

function analysisSubPK(analysisId: string) {
    return `WS_SUB#${analysisId}`;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
    const { routeKey, connectionId } = event.requestContext;

    try {
        switch (routeKey) {
            case '$connect':
                return await handleConnect(event);

            case '$disconnect':
                await handleDisconnect(connectionId!);
                return { statusCode: 200 };

            default: {
                // All other routes are custom action messages
                const body = event.body ? JSON.parse(event.body) : {};
                return await handleMessage(connectionId!, body, event.requestContext);
            }
        }
    } catch (err) {
        console.error('WebSocket handler error:', err);
        return { statusCode: 500, body: 'Internal error' };
    }
};

// ── $connect ─────────────────────────────────────────────────────────────────

async function handleConnect(event: any) {
    const connectionId: string = event.requestContext.connectionId;
    const token: string | undefined =
        event.queryStringParameters?.token || event.queryStringParameters?.Token;

    // Extract userId from JWT (claim parsing — no full verification; API Gateway
    // authorizer validates the signature before this function is called in prod).
    // For MVP, we trust the claim if present; enhance with Cognito JWKS later.
    let userId = 'anonymous';
    if (token) {
        try {
            const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64url').toString('utf-8')
            );
            userId = payload.sub || 'anonymous';
        } catch {
            // malformed token — allow connection but mark user as anonymous
        }
    }

    const ttl = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // 2 hours

    await dynamoClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: connectionPK(connectionId),
                SK: 'META',
                connectionId,
                userId,
                connectedAt: new Date().toISOString(),
                ttl,
            },
        })
    );

    console.log(`WS connected: ${connectionId} (userId=${userId})`);
    return { statusCode: 200 };
}

// ── $disconnect ───────────────────────────────────────────────────────────────

async function handleDisconnect(connectionId: string) {
    // Delete connection meta
    await dynamoClient.send(
        new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: connectionPK(connectionId), SK: 'META' },
        })
    );

    // Delete all subscription records for this connection
    const subs = await dynamoClient.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': connectionPK(connectionId) },
        })
    );

    const deleteOps = (subs.Items || []).map((item) =>
        dynamoClient.send(
            new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: item.PK, SK: item.SK },
            })
        )
    );
    await Promise.all(deleteOps);

    console.log(`WS disconnected: ${connectionId}`);
}

// ── Custom messages ───────────────────────────────────────────────────────────

async function handleMessage(
    connectionId: string,
    body: any,
    requestContext: any
) {
    const action: string = body.action || body.type || '';

    switch (action) {
        case 'subscribe': {
            const { analysisId } = body;
            if (!analysisId) {
                await sendToConnection(connectionId, requestContext, {
                    type: 'error',
                    payload: { error: 'MissingField', message: 'analysisId is required' },
                    timestamp: new Date().toISOString(),
                });
                return { statusCode: 400 };
            }

            const ttl = Math.floor(Date.now() / 1000) + 2 * 60 * 60;

            // Store subscription: analysisId → connectionId
            await dynamoClient.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        PK: analysisSubPK(analysisId),
                        SK: `CONN#${connectionId}`,
                        connectionId,
                        analysisId,
                        ttl,
                    },
                })
            );

            // Also record subscription on connection side for cleanup
            await dynamoClient.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        PK: connectionPK(connectionId),
                        SK: `SUB#${analysisId}`,
                        connectionId,
                        analysisId,
                        ttl,
                    },
                })
            );

            await sendToConnection(connectionId, requestContext, {
                type: 'subscribed',
                payload: { analysisId, message: 'Subscribed to analysis updates' },
                timestamp: new Date().toISOString(),
            });

            console.log(`WS subscribed: ${connectionId} → analysisId=${analysisId}`);
            return { statusCode: 200 };
        }

        case 'unsubscribe': {
            const { analysisId } = body;
            if (analysisId) {
                await dynamoClient.send(
                    new DeleteCommand({
                        TableName: TABLE_NAME,
                        Key: {
                            PK: analysisSubPK(analysisId),
                            SK: `CONN#${connectionId}`,
                        },
                    })
                );
            }
            return { statusCode: 200 };
        }

        case 'ping': {
            await sendToConnection(connectionId, requestContext, {
                type: 'pong',
                payload: { timestamp: new Date().toISOString() },
                timestamp: new Date().toISOString(),
            });
            return { statusCode: 200 };
        }

        default:
            console.warn(`Unknown WS action: ${action}`);
            return { statusCode: 400, body: `Unknown action: ${action}` };
    }
}

// ── Helper: send message to one connection ────────────────────────────────────

async function sendToConnection(
    connectionId: string,
    requestContext: any,
    message: object
): Promise<void> {
    const endpoint =
        WS_ENDPOINT ||
        `https://${requestContext.domainName}/${requestContext.stage}`;

    const client = new ApiGatewayManagementApiClient({ endpoint });

    try {
        await client.send(
            new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: Buffer.from(JSON.stringify(message)),
            })
        );
    } catch (err: any) {
        if (err.statusCode === 410) {
            // Connection stale — clean up
            console.log(`Stale connection ${connectionId}, removing...`);
            await dynamoClient
                .send(
                    new DeleteCommand({
                        TableName: TABLE_NAME,
                        Key: { PK: connectionPK(connectionId), SK: 'META' },
                    })
                )
                .catch(() => { });
        } else {
            console.error(`Failed to send to ${connectionId}:`, err);
        }
    }
}

// ── Exported: called by stage Lambdas after each stage completes ──────────────

export async function sendProgressUpdate(
    analysisId: string,
    type: 'stageComplete' | 'progress' | 'analysisComplete' | 'error',
    payload: object
): Promise<void> {
    if (!WS_ENDPOINT) {
        console.log('No WS_ENDPOINT configured — skipping WebSocket push');
        return;
    }

    // Get all connections subscribed to this analysis
    const result = await dynamoClient.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': analysisSubPK(analysisId) },
        })
    );

    const connections = (result.Items || []) as Array<{ connectionId: string }>;

    if (connections.length === 0) {
        console.log(`No WS subscribers for ${analysisId}`);
        return;
    }

    const message = {
        type,
        payload: { analysisId, ...payload },
        timestamp: new Date().toISOString(),
    };

    const client = new ApiGatewayManagementApiClient({ endpoint: WS_ENDPOINT });

    const sends = connections.map(async ({ connectionId }) => {
        try {
            await client.send(
                new PostToConnectionCommand({
                    ConnectionId: connectionId,
                    Data: Buffer.from(JSON.stringify(message)),
                })
            );
            console.log(`WS push → ${connectionId}: ${type}`);
        } catch (err: any) {
            if (err.statusCode === 410) {
                // Stale connection; clean up silently
                await dynamoClient
                    .send(
                        new DeleteCommand({
                            TableName: TABLE_NAME,
                            Key: {
                                PK: analysisSubPK(analysisId),
                                SK: `CONN#${connectionId}`,
                            },
                        })
                    )
                    .catch(() => { });
            } else {
                console.error(`WS push failed for ${connectionId}:`, err.message);
            }
        }
    });

    await Promise.all(sends);
}
