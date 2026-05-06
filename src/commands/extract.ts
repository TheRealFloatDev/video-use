import path from "node:path";
import { z } from "zod";
import { extractFramesToRun } from "../video/extract.js";

const OptionsSchema = z.object({
  sceneThreshold: z.coerce.number().min(0).max(1).default(0.3),
  fpsIntervalSeconds: z.coerce.number().positive().default(1),
  minTimeDeltaMs: z.coerce.number().int().nonnegative().default(250),
  maxFrames: z.coerce.number().int().positive().default(300),
  keepDownloads: z.coerce.boolean().default(false),
  outRoot: z.string().optional(),
});

function inferSource(fileOrUrl: string): { type: "file" | "url"; value: string } {
  if (/^https?:\/\//i.test(fileOrUrl)) return { type: "url", value: fileOrUrl };
  return { type: "file", value: path.resolve(fileOrUrl) };
}

export async function runExtractCommand(fileOrUrl: string, rawOpts: Record<string, unknown>) {
  const opts = OptionsSchema.parse(rawOpts);
  const source = inferSource(fileOrUrl);

  const result = await extractFramesToRun(source, opts);

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
}

