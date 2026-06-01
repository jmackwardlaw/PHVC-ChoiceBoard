// Best-effort in-browser video compression so athletes can upload phone clips
// that would otherwise blow past the storage size limit. Downscales to ~720p
// and re-encodes at a lower bitrate using canvas + MediaRecorder. Runs in real
// time (a 40s clip takes ~40s). Always degrades gracefully: on any failure, or
// if the result isn't smaller, it returns the original file untouched.

type Options = {
  maxDimension?: number; // longest side of the output, in px
  bitrate?: number; // target video bitrate, bits/sec
  onProgress?: (fraction: number) => void; // 0..1
};

export async function compressVideo(
  file: File,
  opts: Options = {},
): Promise<File> {
  const maxDimension = opts.maxDimension ?? 1280;
  const bitrate = opts.bitrate ?? 2_500_000;

  // Only attempt for videos in browsers that can record.
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("video")) return file;
  if (typeof MediaRecorder === "undefined") return file;

  const mime =
    [
      "video/mp4;codecs=h264",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((m) => {
      try {
        return MediaRecorder.isTypeSupported(m);
      } catch {
        return false;
      }
    }) ?? "";
  if (!mime) return file; // recording unsupported (older iOS) — keep original

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true; // allow programmatic play(); audio still taps via Web Audio
  video.playsInline = true;

  const cleanup = (extra?: () => void) => {
    URL.revokeObjectURL(url);
    extra?.();
  };

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("metadata"));
    });

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const duration = video.duration;
    if (!vw || !vh || !isFinite(duration) || duration <= 0) {
      cleanup();
      return file;
    }

    const scale = Math.min(1, maxDimension / Math.max(vw, vh));
    const w = Math.max(2, Math.round((vw * scale) / 2) * 2);
    const h = Math.max(2, Math.round((vh * scale) / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      cleanup();
      return file;
    }

    const stream = canvas.captureStream(30);

    // Try to carry the original audio across via Web Audio.
    let audioCtx: AudioContext | undefined;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = new AC();
      if (audioCtx.state === "suspended") await audioCtx.resume().catch(() => {});
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      for (const t of dest.stream.getAudioTracks()) stream.addTrack(t);
    } catch {
      /* no audio track — proceed video-only */
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: bitrate,
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const recorded = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    });

    recorder.start(250);
    await video.play().catch(() => {});

    await new Promise<void>((resolve) => {
      const tick = () => {
        if (video.ended || video.paused) {
          resolve();
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        opts.onProgress?.(Math.min(0.99, video.currentTime / duration));
        requestAnimationFrame(tick);
      };
      video.onended = () => resolve();
      requestAnimationFrame(tick);
    });

    if (recorder.state !== "inactive") recorder.stop();
    const blob = await recorded;
    opts.onProgress?.(1);
    cleanup(() => audioCtx?.close().catch(() => {}));

    if (!blob.size || blob.size >= file.size) return file;

    const ext = mime.includes("mp4") ? "mp4" : "webm";
    const base = file.name.replace(/\.[^.]+$/, "") || "video";
    return new File([blob], `${base}-compressed.${ext}`, { type: blob.type });
  } catch {
    cleanup();
    return file;
  }
}
