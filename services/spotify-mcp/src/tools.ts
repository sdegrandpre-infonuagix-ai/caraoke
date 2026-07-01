import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SpotifyController } from './spotify/index.js';

/** MCP tool result shape (a thin subset of the SDK's CallToolResult). */
export interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

function ok(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function err(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (e) {
    return err(e instanceof Error ? e.message : 'spotify tool error');
  }
}

// --- Pure handlers (unit-tested without the MCP transport) --------------------

export function playTool(
  controller: SpotifyController,
  args: { accessToken: string; trackUri: string; positionMs?: number },
): Promise<ToolResult> {
  return guard(async () => {
    await controller.play(args.accessToken, args.trackUri, args.positionMs ?? 0);
    return ok(`Playing ${args.trackUri} from ${args.positionMs ?? 0}ms.`);
  });
}

export function pauseTool(
  controller: SpotifyController,
  args: { accessToken: string },
): Promise<ToolResult> {
  return guard(async () => {
    await controller.pause(args.accessToken);
    return ok('Playback paused.');
  });
}

export function resumeTool(
  controller: SpotifyController,
  args: { accessToken: string },
): Promise<ToolResult> {
  return guard(async () => {
    await controller.resume(args.accessToken);
    return ok('Playback resumed.');
  });
}

export function getPlaybackStateTool(
  controller: SpotifyController,
  args: { accessToken: string },
): Promise<ToolResult> {
  return guard(async () => {
    const state = await controller.getPlaybackState(args.accessToken);
    return ok(JSON.stringify(state));
  });
}

// --- Registration onto an McpServer ------------------------------------------

const accessToken = z
  .string()
  .min(1)
  .describe("The user's Spotify Premium access token.");

/** Register the playback-control tools (AR3) onto the MCP server. */
export function registerSpotifyTools(server: McpServer, controller: SpotifyController): void {
  server.registerTool(
    'play_track',
    {
      description:
        "Start a track on the user's own Spotify device. Control-plane only — never streams audio (NFR21).",
      inputSchema: {
        accessToken,
        trackUri: z.string().describe('A Spotify track URI, e.g. spotify:track:...'),
        positionMs: z.number().int().nonnegative().optional(),
      },
    },
    (args) => playTool(controller, args),
  );

  server.registerTool(
    'pause_playback',
    { description: "Pause the user's Spotify playback.", inputSchema: { accessToken } },
    (args) => pauseTool(controller, args),
  );

  server.registerTool(
    'resume_playback',
    { description: "Resume the user's Spotify playback.", inputSchema: { accessToken } },
    (args) => resumeTool(controller, args),
  );

  server.registerTool(
    'get_playback_state',
    {
      description: "Get the user's current Spotify playback state.",
      inputSchema: { accessToken },
    },
    (args) => getPlaybackStateTool(controller, args),
  );
}
