import * as clack from "@clack/prompts";
import { resolve, dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SKILL_AGENTS = [
  { value: "cursor", label: "Cursor" },
  { value: "github-copilot", label: "VS Code / GitHub Copilot" },
  { value: "claude-code", label: "Claude Code" },
  { value: "codex", label: "Codex" },
  { value: "cline", label: "Cline" },
  { value: "gemini-cli", label: "Gemini CLI" },
  { value: "goose", label: "Goose" },
  { value: "opencode", label: "OpenCode" },
] as const;

function getBundledSkillDir(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));

  const candidates = [
    // Installed via npm/npx — assets is sibling to dist/
    join(here, "..", "..", "assets", "skills"),
    // In-repo dev — assets at repo root
    join(here, "..", "..", "..", "assets", "skills"),
  ];

  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    if (existsSync(join(resolved, "video-use", "SKILL.md"))) return resolved;
  }

  return null;
}

export async function installSkill(projectRoot: string) {
  const doInstall = await clack.confirm({
    message: "Install video-use workflow skill? (Teaches agents how to use video-use tools)",
    initialValue: true,
  });
  if (clack.isCancel(doInstall) || !doInstall) return;

  const skillDir = getBundledSkillDir();
  if (!skillDir) {
    clack.log.warn("Could not find bundled skill asset — skipping.");
    return;
  }

  const agentChoice = await clack.select({
    message: "Install skill for which agents?",
    options: [
      { value: "all", label: "All detected agents", hint: "Auto-detect installed agents" },
      { value: "pick", label: "Let me pick" },
    ],
  });
  if (clack.isCancel(agentChoice)) return;

  const skillAgentArgs: string[] = [];
  if (agentChoice === "pick") {
    const selected = await clack.multiselect({
      message: "Which agents should get the video-use skill?",
      options: SKILL_AGENTS.map((a) => ({ value: a.value, label: a.label })),
      required: true,
    });
    if (clack.isCancel(selected)) return;
    for (const agent of selected as string[]) skillAgentArgs.push("-a", agent);
  }

  const scope = await clack.select({
    message: "Skill installation scope?",
    options: [
      { value: "project", label: "Project (default)", hint: "Committed with your repo" },
      { value: "global", label: "Global", hint: "Available across all projects" },
    ],
  });
  if (clack.isCancel(scope)) return;

  const skillArgs = ["skills", "add", skillDir, "--skill", "video-use", "--copy", "-y"];
  if (agentChoice === "all") skillArgs.push("--all");
  else skillArgs.push(...skillAgentArgs);
  if (scope === "global") skillArgs.push("-g");

  const s = clack.spinner();
  s.start("Installing video-use skill...");
  try {
    await execFileAsync("npx", skillArgs, { cwd: projectRoot, timeout: 60_000 });
    s.stop("video-use skill installed successfully");
  } catch (err) {
    s.stop("Skill installation failed");
    const msg = err instanceof Error ? err.message : String(err);
    clack.log.warn(
      `Could not install skill: ${msg}\nYou can install manually: npx skills add ${skillDir} --skill video-use --copy -y`
    );
  }
}

export async function runSkillCommand(_rawOpts: Record<string, unknown>) {
  const root = resolve(".");
  clack.intro("video-use Skill");
  if (!existsSync(root)) {
    clack.log.error(`Path does not exist: ${root}`);
    process.exit(1);
  }
  await installSkill(root);
  clack.outro("Done!");
}

