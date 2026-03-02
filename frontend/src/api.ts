const BASE_URL = "http://localhost:8000";

export interface UploadResultItem {
  url: string;
  status: "success" | "error";
  vk_video_id: string | null;
  title: string | null;
  error: string | null;
}

export interface HistoryItem {
  id: number;
  youtube_url: string;
  title: string | null;
  vk_video_id: string | null;
  quality: string;
  status: string;
  error: string | null;
  created_at: number;
}

export interface TrendingVideo {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration: number | null;
  thumbnail: string;
  view_count: number | null;
}

export interface UploadOptions {
  customTitle: string;
  customDescription: string;
  includeYtDescription: boolean;
  includeYtLink: boolean;
}

export const DEFAULT_UPLOAD_OPTIONS: UploadOptions = {
  customTitle: "",
  customDescription: "",
  includeYtDescription: false,
  includeYtLink: false,
};

export async function uploadSingleVideo(
  url: string,
  quality: string,
  signal?: AbortSignal,
  options?: UploadOptions
): Promise<UploadResultItem> {
  const opts = options ?? DEFAULT_UPLOAD_OPTIONS;
  const resp = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: [url],
      quality,
      custom_title: opts.customTitle,
      custom_description: opts.customDescription,
      include_yt_description: opts.includeYtDescription,
      include_yt_link: opts.includeYtLink,
    }),
    signal,
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  const data: UploadResultItem[] = await resp.json();
  return data[0];
}

export interface VideoMeta {
  title: string;
  description: string;
  thumbnail: string;
  duration: number | null;
  channel: string;
  error?: string;
}

export async function fetchVideoMeta(url: string): Promise<VideoMeta> {
  const resp = await fetch(
    `${BASE_URL}/api/meta?url=${encodeURIComponent(url)}`
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  const resp = await fetch(`${BASE_URL}/api/history`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function fetchTrending(): Promise<TrendingVideo[]> {
  const resp = await fetch(`${BASE_URL}/api/trending`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function fetchChannelVideos(
  channelUrl: string
): Promise<TrendingVideo[]> {
  const resp = await fetch(
    `${BASE_URL}/api/channel?url=${encodeURIComponent(channelUrl)}`
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}
