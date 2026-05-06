import { requireBinaries } from "../video/doctor.js";

export async function runDoctorCommand() {
  const info = await requireBinaries({ requireYtDlp: true });
  const ffmpegV = info.ffmpeg?.version ?? "unknown";
  const ytdlpV = info.ytDlp?.version ?? "unknown";

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        ffmpeg: ffmpegV,
        ytDlp: ytdlpV,
        node: process.version,
      },
      null,
      2
    )
  );
}

