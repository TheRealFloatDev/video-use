import { execa } from "execa";

async function tryVersion(cmd: string, args: string[]) {
  try {
    const res = await execa(cmd, args, { reject: false });
    if (res.exitCode !== 0) return { ok: false as const, error: res.stderr || res.stdout || "unknown error" };
    const v = (res.stdout || res.stderr).trim().split(/\r?\n/)[0];
    return { ok: true as const, version: v };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function requireBinaries(opts: { requireYtDlp: boolean }) {
  const ffmpeg = await tryVersion("ffmpeg", ["-version"]);
  if (!ffmpeg.ok) {
    throw new Error(
      `ffmpeg not found/executable. Please install ffmpeg (e.g. macOS: brew install ffmpeg). Error: ${ffmpeg.error}`
    );
  }

  const ytDlp = await tryVersion("yt-dlp", ["--version"]);
  if (opts.requireYtDlp && !ytDlp.ok) {
    throw new Error(
      `yt-dlp not found/executable. Please install yt-dlp (e.g. macOS: brew install yt-dlp). Error: ${ytDlp.error}`
    );
  }

  return {
    ffmpeg: ffmpeg.ok ? { version: ffmpeg.version } : undefined,
    ytDlp: ytDlp.ok ? { version: ytDlp.version } : undefined,
  };
}

