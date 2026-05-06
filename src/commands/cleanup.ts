import { z } from "zod";
import { cleanupRuns } from "../video/cleanup.js";

const OptionsSchema = z.object({
  run: z.string().optional(),
});

export async function runCleanupCommand(rawOpts: Record<string, unknown>) {
  const opts = OptionsSchema.parse(rawOpts);
  const res = await cleanupRuns(opts.run);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(res, null, 2));
}

