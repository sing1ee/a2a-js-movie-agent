import { Hono, type Context } from 'hono';
import { stream } from 'hono/streaming';

import { A2AError, JsonRpcTransportHandler } from "@a2a-js/sdk";
import type { 
  A2AResponse, 
  JSONRPCErrorResponse, 
  JSONRPCSuccessResponse,
  A2ARequestHandler
} from "@a2a-js/sdk";

export class A2AHonoApp {
    private requestHandler: A2ARequestHandler; // Kept for getAgentCard
    private jsonRpcTransportHandler: JsonRpcTransportHandler;

    constructor(requestHandler: A2ARequestHandler) {
        this.requestHandler = requestHandler; // DefaultRequestHandler instance
        this.jsonRpcTransportHandler = new JsonRpcTransportHandler(requestHandler);
    }

    /**
     * Creates a Hono app with A2A routes.
     * @param baseUrl The base URL for A2A endpoints (e.g., "/a2a/api").
     * @returns The Hono app with A2A routes.
     */
    public createApp(baseUrl: string = ''): Hono {
        const app = new Hono();

        // Agent card endpoint
        app.get(`${baseUrl}/.well-known/agent.json`, async (c: Context) => {
            try {
                // getAgentCard is on A2ARequestHandler, which DefaultRequestHandler implements
                const agentCard = await this.requestHandler.getAgentCard();
                return c.json(agentCard);
            } catch (error: any) {
                console.error("Error fetching agent card:", error);
                return c.json({ error: "Failed to retrieve agent card" }, 500);
            }
        });

        // Main A2A endpoint
        app.post(baseUrl || '/', async (c: Context) => {
            try {
                const requestBody = await c.req.json();
                const rpcResponseOrStream = await this.jsonRpcTransportHandler.handle(requestBody);

                // Check if it's an AsyncGenerator (stream)
                if (typeof (rpcResponseOrStream as any)?.[Symbol.asyncIterator] === 'function') {
                    const streamData = rpcResponseOrStream as AsyncGenerator<JSONRPCSuccessResponse, void, undefined>;

                    // Use Hono's streaming response
                    return stream(c, async (stream: any) => {
                        // Set headers for SSE
                        c.header('Content-Type', 'text/event-stream');
                        c.header('Cache-Control', 'no-cache');
                        c.header('Connection', 'keep-alive');

                        try {
                            for await (const event of streamData) {
                                // Each event from the stream is already a JSONRPCResult
                                await stream.write(`id: ${new Date().getTime()}\n`);
                                await stream.write(`data: ${JSON.stringify(event)}\n\n`);
                            }
                        } catch (streamError: any) {
                            console.error(`Error during SSE streaming (request ${requestBody?.id}):`, streamError);
                            // If the stream itself throws an error, send a final JSONRPCErrorResponse
                            const a2aError = streamError instanceof A2AError ? streamError : A2AError.internalError(streamError.message || 'Streaming error.');
                            const errorResponse: JSONRPCErrorResponse = {
                                jsonrpc: '2.0',
                                id: requestBody?.id || null, // Use original request ID if available
                                error: a2aError.toJSONRPCError(),
                            };
                            
                            // Try to send as last SSE event
                            await stream.write(`id: ${new Date().getTime()}\n`);
                            await stream.write(`event: error\n`); // Custom event type for client-side handling
                            await stream.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
                        }
                    });
                } else { 
                    // Single JSON-RPC response
                    const rpcResponse = rpcResponseOrStream as A2AResponse;
                    return c.json(rpcResponse, 200);
                }
            } catch (error: any) { 
                // Catch errors from jsonRpcTransportHandler.handle itself (e.g., initial parse error)
                console.error("Unhandled error in A2AHonoApp POST handler:", error);
                const a2aError = error instanceof A2AError ? error : A2AError.internalError('General processing error.');
                const errorResponse: JSONRPCErrorResponse = {
                    jsonrpc: '2.0',
                    id: (await c.req.json().catch(() => ({})))?.id || null,
                    error: a2aError.toJSONRPCError(),
                };
                return c.json(errorResponse, 500);
            }
        });

        // Health check endpoint
        app.get('/health', (c: Context) => {
            return c.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        return app;
    }
} 