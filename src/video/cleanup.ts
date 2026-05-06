import fs from "node:fs/promises";
import path from "node:path";
import { defaultOutRoot } from "./paths.js";

function assertSafeRunHash(runHash: string) {
  if (!/^[a-f0-9]{6,64}$/i.test(runHash)) {
    throw new Error("Invalid runHash format.");
  }
}

async function rmIfExists(p: string) {
  try {
    await fs.rm(p, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function cleanupRuns(runHash?: string) {
  const root = defaultOutRoot(process.cwd());
  const framesRoot = path.join(root, "frames");
  const downloadsRoot = path.join(root, "downloads");

  if (runHash) {
    assertSafeRunHash(runHash);
    const a = await rmIfExists(path.join(framesRoot, runHash));
    const b = await rmIfExists(path.join(downloadsRoot, runHash));
    return { ok: true, root, deleted: { runs: Number(a) + Number(b), files: 0 } };
  }

  await rmIfExists(framesRoot);
  await rmIfExists(downloadsRoot);
  return { ok: true, root, deleted: { runs: -1, files: -1 } };
}

