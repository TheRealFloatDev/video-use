import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";

export async function downloadWithYtDlp(args: {
  url: string;
  outDir: string;
}): Promise<{ videoPath: string; infoJsonPath?: string }> {
  await fs.mkdir(args.outDir, { recursive: true });

  const outTemplate = path.join(args.outDir, "video.%(ext)s");
  const infoJsonTemplate = path.join(args.outDir, "info.json");

  const res = await execa(
    "yt-dlp",
    [
      "--no-playlist",
      "--no-progress",
      "--write-info-json",
      "-o",
      outTemplate,
      args.url,
    ],
    { reject: false }
  );

  if (res.exitCode !== 0) {
    throw new Error(`yt-dlp download failed: ${res.stderr || res.stdout || "unknown error"}`.trim());
  }

  // Find downloaded file: prefer video.* in outDir
  const entries = await fs.readdir(args.outDir);
  const video = entries.find(
    (e) => e.startsWith("video.") && !e.endsWith(".part") && !e.endsWith(".info.json")
  );
  if (!video) {
    throw new Error(`yt-dlp finished but no video.* found in ${args.outDir}`);
  }

  // yt-dlp writes info json as video.info.json by default; we also accept that
  const infoJson =
    entries.find((e) => e.endsWith(".info.json")) ??
    (entries.includes(path.basename(infoJsonTemplate)) ? path.basename(infoJsonTemplate) : undefined);

  return {
    videoPath: path.join(args.outDir, video),
    infoJsonPath: infoJson ? path.join(args.outDir, infoJson) : undefined,
  };
}

