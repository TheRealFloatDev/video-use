import fs from "node:fs/promises";
import path from "node:path";
import { requireBinaries } from "./doctor.js";
import { extractFpsFrames, extractSceneFrames } from "./ffmpeg.js";
import { createRunHash } from "./hash.js";
import { capMaxFrames, timeDedupe } from "./dedupe.js";
import { defaultOutRoot, downloadsDir, runDir } from "./paths.js";
import { downloadWithYtDlp } from "./ytDlp.js";
import type { ExtractOptions, FrameCandidate, FrameManifest, VideoSource } from "./types.js";

function pad6(n: number) {
  return String(n).padStart(6, "0");
}

async function pathExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function extractFramesToRun(source: VideoSource, options?: ExtractOptions) {
  const sceneThreshold = options?.sceneThreshold ?? 0.3;
  const fpsIntervalSeconds = options?.fpsIntervalSeconds ?? 1;
  const minTimeDeltaMs = options?.minTimeDeltaMs ?? 250;
  const maxFrames = options?.maxFrames ?? 300;
  const keepDownloads = options?.keepDownloads ?? false;
  const outRoot = options?.outRoot ? path.resolve(options.outRoot) : defaultOutRoot(process.cwd());

  const runHash = createRunHash(`${source.type}:${source.value}`);
  const outRunDir = runDir(outRoot, runHash);
  const outManifestPath = path.join(outRunDir, "manifest.json");

  await fs.mkdir(outRunDir, { recursive: true });

  const bins = await requireBinaries({ requireYtDlp: source.type === "url" });

  let resolvedVideoPath: string | undefined;
  let downloadedPath: string | undefined;

  if (source.type === "file") {
    resolvedVideoPath = path.resolve(source.value);
    if (!(await pathExists(resolvedVideoPath))) {
      throw new Error(`Video file not found: ${resolvedVideoPath}`);
    }
  } else {
    const dlDir = downloadsDir(outRoot, runHash);
    const dl = await downloadWithYtDlp({ url: source.value, outDir: dlDir });
    downloadedPath = dl.videoPath;
    resolvedVideoPath = downloadedPath;
    await fs.writeFile(path.join(dlDir, "source.txt"), source.value + "\n", "utf8");
  }

  const sceneDir = path.join(outRunDir, "_scene");
  const fpsDir = path.join(outRunDir, "_fps");

  const scene = await extractSceneFrames({
    inputPath: resolvedVideoPath,
    outDir: sceneDir,
    sceneThreshold,
  });
  const fps = await extractFpsFrames({
    inputPath: resolvedVideoPath,
    outDir: fpsDir,
    fpsIntervalSeconds,
  });

  const sceneCandidates: FrameCandidate[] = scene.map((f) => ({ ...f, source: "scene" as const }));
  const fpsCandidates: FrameCandidate[] = fps.map((f) => ({ ...f, source: "fps" as const }));

  const merged = [...sceneCandidates, ...fpsCandidates].sort((a, b) => a.t - b.t);
  const { kept: deduped, removed } = timeDedupe(merged, minTimeDeltaMs);
  const capped = capMaxFrames(deduped, maxFrames);

  const finalFrames = capped.frames;

  // Copy/renumber to root of runDir
  const framesOut: FrameManifest["frames"] = [];
  for (let i = 0; i < finalFrames.length; i++) {
    const f = finalFrames[i]!;
    const filename = `${pad6(i + 1)}.png`;
    const dst = path.join(outRunDir, filename);
    await fs.copyFile(f.path, dst);
    framesOut.push({ index: i + 1, filename, t: f.t, source: f.source });
  }

  // Optional cleanup of downloads on URL sources
  if (source.type === "url" && !keepDownloads && downloadedPath) {
    const dlDir = downloadsDir(outRoot, runHash);
    await fs.rm(dlDir, { recursive: true, force: true });
  }

  // Remove temp extraction dirs
  await fs.rm(sceneDir, { recursive: true, force: true });
  await fs.rm(fpsDir, { recursive: true, force: true });

  const manifest: FrameManifest = {
    version: 1,
    runHash,
    createdAt: new Date().toISOString(),
    input: {
      type: source.type,
      original: source.value,
      resolvedPath: source.type === "file" ? resolvedVideoPath : undefined,
      downloadedPath: source.type === "url" ? downloadedPath : undefined,
    },
    tools: {
      ffmpegVersion: bins.ffmpeg?.version,
      ytDlpVersion: bins.ytDlp?.version,
    },
    options: {
      sceneThreshold,
      fpsIntervalSeconds,
      minTimeDeltaMs,
      maxFrames,
      keepDownloads,
      outRoot,
    },
    stats: {
      sceneFrames: sceneCandidates.length,
      fpsFrames: fpsCandidates.length,
      merged: merged.length,
      removedByTimeDedup: removed,
      cappedByMaxFrames: capped.capped,
      final: framesOut.length,
    },
    frames: framesOut,
  };

  await fs.writeFile(outManifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  return {
    runHash,
    outputDir: outRunDir,
    manifestPath: outManifestPath,
    frames: framesOut,
    summary: manifest.stats,
  };
}

