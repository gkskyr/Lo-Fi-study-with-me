// Canvas-based image comparison utilities — camera check only

export const BOX_RATIO = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 };
const THUMB_SIZE = 32;

export function getBoxPixels(video: HTMLVideoElement) {
  const vw = video.videoWidth || 320;
  const vh = video.videoHeight || 240;
  return {
    x: Math.round(vw * BOX_RATIO.x),
    y: Math.round(vh * BOX_RATIO.y),
    w: Math.round(vw * BOX_RATIO.w),
    h: Math.round(vh * BOX_RATIO.h),
  };
}

export function captureRegion(
  video: HTMLVideoElement,
  region?: { x: number; y: number; w: number; h: number },
): ImageData {
  const r = region ?? { x: 0, y: 0, w: video.videoWidth || 224, h: video.videoHeight || 224 };
  const c = document.createElement("canvas");
  c.width = r.w;
  c.height = r.h;
  c.getContext("2d")!.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return c.getContext("2d")!.getImageData(0, 0, r.w, r.h);
}

export function thumbprint(imageData: ImageData): number[] {
  const src = document.createElement("canvas");
  src.width = imageData.width;
  src.height = imageData.height;
  src.getContext("2d")!.putImageData(imageData, 0, 0);

  const dst = document.createElement("canvas");
  dst.width = THUMB_SIZE;
  dst.height = THUMB_SIZE;
  dst.getContext("2d")!.drawImage(src, 0, 0, THUMB_SIZE, THUMB_SIZE);
  const small = dst.getContext("2d")!.getImageData(0, 0, THUMB_SIZE, THUMB_SIZE);

  const result: number[] = [];
  for (let i = 0; i < small.data.length; i += 4) {
    result.push(0.299 * small.data[i] + 0.587 * small.data[i + 1] + 0.114 * small.data[i + 2]);
  }
  return result;
}

export function similarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return 1 - sum / (a.length * 255);
}
