export type VideoSource =
  | { type: "file"; value: string }
  | { type: "url"; value: string };

export type ExtractOptions = {
  sceneThreshold?: number;
  fpsIntervalSeconds?: number;
  minTimeDeltaMs?: number;
  maxFrames?: number;
  keepDownloads?: boolean;
  outRoot?: string;
};

export type FrameCandidate = {
  t: number;
  source: "scene" | "fps";
  path: string;
};

export type FrameManifest = {
  version: 1;
  runHash: string;
  createdAt: string;
  input: {
    type: "file" | "url";
    original: string;
    resolvedPath?: string;
    downloadedPath?: string;
  };
  tools: {
    ffmpegVersion?: string;
    ytDlpVersion?: string;
  };
  options: {
    sceneThreshold: number;
    fpsIntervalSeconds: number;
    minTimeDeltaMs: number;
    maxFrames: number;
    keepDownloads: boolean;
    outRoot: string;
  };
  stats: {
    sceneFrames: number;
    fpsFrames: number;
    merged: number;
    removedByTimeDedup: number;
    cappedByMaxFrames: boolean;
    final: number;
  };
  frames: Array<{
    index: number;
    filename: string;
    t: number;
    source: "scene" | "fps";
  }>;
};

