import type { FrameCandidate } from "./types.js";

export function timeDedupe(
  frames: FrameCandidate[],
  minTimeDeltaMs: number
): { kept: FrameCandidate[]; removed: number } {
  const minDelta = minTimeDeltaMs / 1000;
  const kept: FrameCandidate[] = [];
  let removed = 0;

  for (const f of frames) {
    const last = kept[kept.length - 1];
    if (!last) {
      kept.push(f);
      continue;
    }

    const dt = f.t - last.t;
    if (dt >= minDelta) {
      kept.push(f);
      continue;
    }

    // within window: prefer scene over fps
    if (last.source === "fps" && f.source === "scene") {
      kept[kept.length - 1] = f;
    } else {
      // keep existing
    }
    removed++;
  }

  return { kept, removed };
}

export function capMaxFrames(frames: FrameCandidate[], maxFrames: number): { frames: FrameCandidate[]; capped: boolean } {
  if (frames.length <= maxFrames) return { frames, capped: false };
  if (maxFrames <= 1) return { frames: [frames[0]!], capped: true };

  const n = frames.length;
  const out: FrameCandidate[] = [];
  const step = (n - 1) / (maxFrames - 1);
  for (let i = 0; i < maxFrames; i++) {
    const idx = Math.round(i * step);
    out.push(frames[Math.min(n - 1, Math.max(0, idx))]!);
  }

  // Ensure monotonic by t and remove exact duplicates from rounding.
  const unique: FrameCandidate[] = [];
  for (const f of out) {
    const prev = unique[unique.length - 1];
    if (!prev || f.path !== prev.path) unique.push(f);
  }

  return { frames: unique, capped: true };
}

