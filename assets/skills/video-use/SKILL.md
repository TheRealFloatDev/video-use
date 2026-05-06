---
name: video-use
description: "Use video-use MCP tools to download videos and extract representative frames + timestamps for analysis. Prefer video_frames_extract + manifest.json over manual ffmpeg/yt-dlp usage."
---

# video-use MCP Skill

Use the `video-use` MCP server to analyze videos by extracting key frames.

## When to use

- The user provides a video file or a video URL and asks what happens in it
- You need timestamps + representative frames to reason about UI flows, animations, or scene changes

## Preferred workflow

1. Call `video_frames_extract` with either a local file path or URL.
2. Read the returned `manifest.json` and use the extracted frames in chronological order.
3. If you need to free disk space, call `video_cleanup` (optionally with `runHash`).

## Tool call hints

- Use `options.sceneThreshold` around 0.25–0.35 for typical screen recordings.
- Keep `minTimeDeltaMs=250` unless you miss rapid changes.
- Set `maxFrames` to cap output for very dynamic videos.