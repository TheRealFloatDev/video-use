import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import type { VideoSource } from "./types.js";
import { defaultOutRoot } from "./paths.js";

async function tryRun(cmd: string, args: string[]) {
  try {
    const res = await execa(cmd, args, { reject: false });
    return res;
  } catch (e) {
    return { exitCode: 1, stdout: "", stderr: e instanceof Error ? e.message : String(e) } as any;
  }
}

export async function probeVideo(source: VideoSource, opts?: { outRoot?: string }) {
  const outRoot = opts?.outRoot ? path.resolve(opts.outRoot) : defaultOutRoot(process.cwd());

  if (source.type === "url") {
    const res = await tryRun("yt-dlp", ["-j", "--no-playlist", source.value]);
    if (res.exitCode !== 0) {
      throw new Error(`yt-dlp probe failed: ${res.stderr || res.stdout || "unknown error"}`.trim());
    }
    const json = JSON.parse(res.stdout);
    return {
      ok: true,
      type: "url",
      url: source.value,
      title: json.title,
      duration: json.duration,
      width: json.width,
      height: json.height,
      extractor: json.extractor,
      webpage_url: json.webpage_url,
    };
  }

  const filePath = path.resolve(source.value);
  await fs.access(filePath);

  const res = await tryRun("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);

  if (res.exitCode === 0) {
    return { ok: true, type: "file", path: filePath, ffprobe: JSON.parse(res.stdout) };
  }

  // Fallback: very light parsing from ffmpeg -i
  const res2 = await tryRun("ffmpeg", ["-hide_banner", "-nostdin", "-i", filePath]);
  return { ok: true, type: "file", path: filePath, ffmpegInfo: res2.stderr || res2.stdout };
}

