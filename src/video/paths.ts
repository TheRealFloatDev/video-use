import path from "node:path";

export function defaultOutRoot(cwd: string) {
  return path.resolve(cwd, ".video-use");
}

export function runDir(outRoot: string, runHash: string) {
  return path.join(outRoot, "frames", runHash);
}

export function downloadsDir(outRoot: string, runHash: string) {
  return path.join(outRoot, "downloads", runHash);
}

