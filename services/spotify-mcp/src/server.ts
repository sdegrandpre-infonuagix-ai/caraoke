import express, { type Express } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { SpotifyController } from './spotify/index.js';
import { registerSpotifyTools } from './tools.js';

/** Build a fresh MCP server with the Spotify playback tools registered. */
export function buildMcpServer(controller: SpotifyController): McpServer {
  const server = new McpServer({ name: 'caraoke-spotify-mcp', version: '0.1.0' });
  registerSpotifyTools(server, controller);
  return server;
}

/**
 * HTTP app exposing the MCP server over the streamable-http transport (AR3) at POST /mcp.
 * Stateless mode: a fresh server+transport per request (no session affinity needed behind
 * the ECS Express load balancer).
 */
export function createHttpApp(controller: SpotifyController): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ data: { status: 'ok', service: 'caraoke-spotify-mcp', mode: controller.mode }, error: null });
  });

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => void transport.close());
    const server = buildMcpServer(controller);
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Stateless transport: no server-initiated streams or sessions to tear down.
  const methodNotAllowed = (_req: express.Request, res: express.Response) => {
    res.status(405).json({
      data: null,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for the stateless MCP endpoint.' },
    });
  };
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  return app;
}
