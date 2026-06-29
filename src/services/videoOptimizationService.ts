const CLOUDINARY_VIDEO_MARKER = '/video/upload/';
const CLOUDINARY_IMAGE_MARKER = '/image/upload/';

export function buildOptimizedCloudinaryImageUrl(url: string, options?: { width?: number; quality?: string }) {
  if (!url || !url.includes(CLOUDINARY_IMAGE_MARKER)) return url;
  const width = options?.width ?? 720;
  const quality = options?.quality ?? 'q_auto:eco';
  const transform = `f_auto,${quality},w_${width},c_limit`;
  const [base, query = ''] = url.split('?');
  const optimized = base.includes(`${CLOUDINARY_IMAGE_MARKER}${transform}/`)
    ? base
    : base.replace(CLOUDINARY_IMAGE_MARKER, `${CLOUDINARY_IMAGE_MARKER}${transform}/`);

  return query ? `${optimized}?${query}` : optimized;
}

export function buildOptimizedCloudinaryVideoUrl(url: string, options?: { width?: number; hls?: boolean }) {
  if (!url || !url.includes(CLOUDINARY_VIDEO_MARKER)) return url;
  const width = options?.width ?? 720;
  const transform = options?.hls ? `sp_auto,f_auto,q_auto,w_${width},c_limit` : `f_auto,q_auto,w_${width},c_limit`;
  const [base, query = ''] = url.split('?');
  const optimized = base.includes(`${CLOUDINARY_VIDEO_MARKER}${transform}/`)
    ? base
    : base.replace(CLOUDINARY_VIDEO_MARKER, `${CLOUDINARY_VIDEO_MARKER}${transform}/`);

  if (!options?.hls) return query ? `${optimized}?${query}` : optimized;

  const withoutExt = optimized.replace(/\.(mp4|mov|m4v|webm)$/i, '');
  const hlsUrl = `${withoutExt}.m3u8`;
  return query ? `${hlsUrl}?${query}` : hlsUrl;
}

export function buildCloudinaryVideoPosterUrl(url: string, options?: { width?: number }) {
  if (!url || !url.includes(CLOUDINARY_VIDEO_MARKER)) return undefined;
  const width = options?.width ?? 720;
  const [base] = url.split('?');
  const transformed = base.replace(CLOUDINARY_VIDEO_MARKER, `/video/upload/so_0,f_jpg,q_auto,w_${width},c_limit/`);
  return transformed.replace(/\.(mp4|mov|m4v|webm)$/i, '.jpg');
}

export function shouldUseHlsVideo() {
  return false;
}
