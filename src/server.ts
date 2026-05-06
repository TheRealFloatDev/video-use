import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { extractFramesToRun } from "./video/extract.js";
import { cleanupRuns } from "./video/cleanup.js";
import { probeVideo } from "./video/probe.js";

const VideoSourceSchema = z.object({
  type: z.enum(["file", "url"]),
  value: z.string().min(1),
});

const ExtractOptionsSchema = z
  .object({
    sceneThreshold: z.number().min(0).max(1).optional(),
    fpsIntervalSeconds: z.number().positive().optional(),
    minTimeDeltaMs: z.number().int().nonnegative().optional(),
    maxFrames: z.number().int().positive().optional(),
    keepDownloads: z.boolean().optional(),
    outRoot: z.string().min(1).optional(),
  })
  .optional();

const ExtractInputSchema = z.object({
  source: VideoSourceSchema,
  options: ExtractOptionsSchema,
});

const CleanupInputSchema = z
  .object({
    runHash: z.string().min(1).optional(),
  })
  .optional();

export async function startMcpServer() {
  const server = new Server(
    {
      name: "video-use",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "video_frames_extract",
          description:
            "Extract key frames from a local video file or URL (downloads URL via yt-dlp), using scene-change + fallback sampling. Writes frames + manifest to .video-use/frames/<runHash>/ and returns runHash.",
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["file", "url"] },
                  value: { type: "string" },
                },
                required: ["type", "value"],
              },
              options: {
                type: "object",
                properties: {
                  sceneThreshold: { type: "number", minimum: 0, maximum: 1 },
                  fpsIntervalSeconds: { type: "number", minimum: 0 },
                  minTimeDeltaMs: { type: "number", minimum: 0 },
                  maxFrames: { type: "number", minimum: 1 },
                  keepDownloads: { type: "boolean" },
                  outRoot: { type: "string" },
                },
              },
            },
            required: ["source"],
          },
        },
        {
          name: "video_probe",
          description:
            "Probe a local video file (ffprobe if available, else ffmpeg -i) or a URL (yt-dlp -j). Returns duration/streams/metadata.",
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["file", "url"] },
                  value: { type: "string" },
                },
                required: ["type", "value"],
              },
            },
            required: ["source"],
          },
        },
        {
          name: "video_cleanup",
          description:
            "Cleanup .video-use downloads and frames. With runHash: only that run; without: all runs.",
          inputSchema: {
            type: "object",
            properties: {
              runHash: { type: "string" },
            },
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const toolName = req.params.name;
    const rawArgs = req.params.arguments;

    if (toolName === "video_frames_extract") {
      const input = ExtractInputSchema.parse(rawArgs);
      const result = await extractFramesToRun(input.source, input.options);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (toolName === "video_probe") {
      const input = z.object({ source: VideoSourceSchema }).parse(rawArgs);
      const result = await probeVideo(input.source);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (toolName === "video_cleanup") {
      const input = CleanupInputSchema?.parse(rawArgs);
      const result = await cleanupRuns(input?.runHash);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${toolName}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Keep process alive in CLI/tty usage; MCP clients keep stdio open anyway.
  await new Promise<void>(() => {});
}

