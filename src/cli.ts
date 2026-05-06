#!/usr/bin/env node

import { Command } from "commander";
import { runCleanupCommand } from "./commands/cleanup.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runExtractCommand } from "./commands/extract.js";
import { runInitCommand } from "./commands/init.js";
import { runSkillCommand } from "./commands/skill.js";
import { startMcpServer } from "./server.js";

function looksLikeSubcommand(argv: string[]): boolean {
  const args = argv.slice(2);
  const first = args[0];
  if (!first) return false;
  if (first.startsWith("-")) return false;
  return ["extract", "doctor", "init", "skill", "cleanup", "help", "--help", "-h"].includes(first);
}

async function main() {
  if (!looksLikeSubcommand(process.argv)) {
    await startMcpServer();
    return;
  }

  const program = new Command();
  program.name("video-use").description("MCP server + CLI to extract key video frames.");

  program
    .command("extract")
    .argument("<fileOrUrl>", "Video file path or URL")
    .option("--scene-threshold <number>", "Scene threshold (0..1). Default 0.30", "0.30")
    .option("--fps-interval-seconds <number>", "Fallback sampling interval in seconds. Default 1", "1")
    .option("--min-time-delta-ms <number>", "Time-based dedupe window in ms. Default 250", "250")
    .option("--max-frames <number>", "Maximum output frames (downsample after merge). Default 300", "300")
    .option("--keep-downloads", "Keep downloaded videos for URL sources", false)
    .option("--out-root <path>", "Override output root (default: .video-use in cwd)")
    .action(async (fileOrUrl: string, opts: Record<string, unknown>) => {
      await runExtractCommand(fileOrUrl, opts);
    });

  program.command("doctor").action(async () => runDoctorCommand());
  program.command("init").action(async () => runInitCommand());
  program
    .command("skill")
    .description("Guided install of the video-use workflow skill")
    .action(async (opts: Record<string, unknown>) => runSkillCommand(opts));

  program
    .command("cleanup")
    .option("--run <hash>", "Cleanup a specific runHash")
    .action(async (opts: Record<string, unknown>) => runCleanupCommand(opts));

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});

