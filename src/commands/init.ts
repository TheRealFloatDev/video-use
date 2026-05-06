import * as clack from "@clack/prompts";
import { resolve } from "node:path";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { installSkill } from "./skill.js";

const execFileAsync = promisify(execFile);

const AGENTS = [
  { value: "cursor", label: "Cursor" },
  { value: "vscode", label: "VS Code / GitHub Copilot" },
  { value: "claude-code", label: "Claude Code" },
  { value: "claude-desktop", label: "Claude Desktop" },
  { value: "codex", label: "Codex" },
  { value: "cline", label: "Cline" },
  { value: "zed", label: "Zed" },
  { value: "gemini-cli", label: "Gemini CLI" },
  { value: "goose", label: "Goose" },
  { value: "opencode", label: "OpenCode" },
] as const;

export async function runInitCommand() {
  const root = resolve(".");
  clack.intro("video-use Init");

  if (!existsSync(root)) {
    clack.log.error(`Path does not exist: ${root}`);
    process.exit(1);
  }

  // --- Add .video-use/ to .gitignore ---
  const gitignorePath = resolve(root, ".gitignore");
  const gitignoreExists = existsSync(gitignorePath);
  const alreadyIgnored =
    gitignoreExists &&
    readFileSync(gitignorePath, "utf-8")
      .split("\n")
      .some((line) => line.trim() === ".video-use" || line.trim() === ".video-use/");

  if (!alreadyIgnored) {
    const addToGitignore = await clack.confirm({
      message: "Add .video-use/ to .gitignore?",
      initialValue: true,
    });

    if (!clack.isCancel(addToGitignore) && addToGitignore) {
      const block = `${gitignoreExists ? "\n" : ""}# video-use (MCP) downloads + extracted frames\n.video-use/\n`;
      appendFileSync(gitignorePath, block, "utf-8");
      clack.log.info(".video-use/ added to .gitignore");
    }
  }

  // --- Install skill ---
  await installSkill(root);

  // --- MCP installation via add-mcp ---
  const installMcp = await clack.confirm({
    message: "Install video-use as an MCP server for your coding agents?",
    initialValue: true,
  });

  if (clack.isCancel(installMcp) || !installMcp) {
    clack.outro("Done!");
    return;
  }

  const selectedAgents = await clack.multiselect({
    message: "Which agents should video-use be installed for?",
    options: AGENTS.map((a) => ({ value: a.value, label: a.label })),
    required: true,
  });

  if (clack.isCancel(selectedAgents)) {
    clack.outro("Done!");
    return;
  }

  const scope = await clack.select({
    message: "Installation scope?",
    options: [
      { value: "global", label: "Global", hint: "Available across all projects (recommended)" },
      { value: "project", label: "Project", hint: "Only this project, committed with your repo" },
    ],
  });
  if (clack.isCancel(scope)) {
    clack.outro("Done!");
    return;
  }

  const mcpSource = await clack.select({
    message: "How should agents run video-use?",
    options: [
      { value: "npx", label: "npx (recommended)", hint: "Runs latest via npx -y video-use" },
      { value: "local", label: "Local install", hint: "Uses your locally installed video-use binary" },
    ],
  });
  if (clack.isCancel(mcpSource)) {
    clack.outro("Done!");
    return;
  }

  const mcpCommand = mcpSource === "npx" ? "npx -y video-use" : "video-use";

  const addMcpArgs = ["add-mcp", mcpCommand, "--name", "video-use", "-y"];
  for (const agent of selectedAgents as string[]) addMcpArgs.push("-a", agent);
  if (scope === "global") addMcpArgs.push("-g");

  const s = clack.spinner();
  s.start(`Installing MCP server for ${(selectedAgents as string[]).join(", ")}...`);
  try {
    await execFileAsync("npx", addMcpArgs, { cwd: root, timeout: 60_000 });
    s.stop("MCP server installed successfully");
  } catch (err) {
    s.stop("MCP installation failed");
    const msg = err instanceof Error ? err.message : String(err);
    clack.log.warn(
      `Could not install MCP server: ${msg}\nYou can install manually: npx add-mcp "${mcpCommand}" --name video-use -y`
    );
  }

  clack.outro("Done!");
}

