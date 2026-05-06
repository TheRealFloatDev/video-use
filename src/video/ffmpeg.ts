import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";

function parsePtsTimes(stderr: string): number[] {
  const times: number[] = [];
  const re = /pts_time:([0-9.]+)/g;
  for (const line of stderr.split(/\r?\n/)) {
    let m: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(line))) {
      const t = Number(m[1]);
      if (Number.isFinite(t)) times.push(t);
    }
  }
  return times;
}

async function listImages(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);
  return entries
    .filter((e) => /\.(jpe?g|png|webp)$/i.test(e))
    .sort((a, b) => a.localeCompare(b, "en"));
}

export async function extractSceneFrames(args: {
  inputPath: string;
  outDir: string;
  sceneThreshold: number;
}): Promise<Array<{ path: string; t: number }>> {
  await fs.mkdir(args.outDir, { recursive: true });
  const outPattern = path.join(args.outDir, "%06d.png");

  const vf = `select='gt(scene,${args.sceneThreshold})',showinfo`;

  const res = await execa(
    "ffmpeg",
    ["-hide_banner", "-nostdin", "-i", args.inputPath, "-vf", vf, "-fps_mode", "vfr", outPattern],
    { reject: false }
  );

  if (res.exitCode !== 0) {
    // Scene extraction can legitimately produce 0 frames. Prefer returning empty if nothing was written.
    const files = await listImages(args.outDir).catch(() => []);
    if (files.length === 0) return [];
    throw new Error(`ffmpeg scene extraction failed: ${res.stderr || res.stdout || "unknown error"}`.trim());
  }

  const times = parsePtsTimes(res.stderr ?? "");
  const files = await listImages(args.outDir);
  const n = Math.min(times.length, files.length);

  const out: Array<{ path: string; t: number }> = [];
  for (let i = 0; i < n; i++) {
    out.push({ path: path.join(args.outDir, files[i]!), t: times[i]! });
  }
  return out;
}

export async function extractFpsFrames(args: {
  inputPath: string;
  outDir: string;
  fpsIntervalSeconds: number;
}): Promise<Array<{ path: string; t: number }>> {
  await fs.mkdir(args.outDir, { recursive: true });
  const outPattern = path.join(args.outDir, "%06d.png");

  const fps = 1 / args.fpsIntervalSeconds;
  const vf = `fps=${fps},showinfo`;

  const res = await execa(
    "ffmpeg",
    ["-hide_banner", "-nostdin", "-i", args.inputPath, "-vf", vf, "-fps_mode", "vfr", outPattern],
    { reject: false }
  );

  if (res.exitCode !== 0) {
    throw new Error(`ffmpeg fps extraction failed: ${res.stderr || res.stdout || "unknown error"}`.trim());
  }

  const times = parsePtsTimes(res.stderr ?? "");
  const files = await listImages(args.outDir);
  const n = Math.min(times.length, files.length);

  const out: Array<{ path: string; t: number }> = [];
  for (let i = 0; i < n; i++) {
    out.push({ path: path.join(args.outDir, files[i]!), t: times[i]! });
  }
  return out;
}

