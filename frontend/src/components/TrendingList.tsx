import { useEffect, useState } from "react";
import type { TrendingVideo, UploadOptions } from "../api.ts";
import { fetchTrending, DEFAULT_UPLOAD_OPTIONS } from "../api.ts";

interface Props {
  onUpload: (url: string, options: UploadOptions) => void;
  onStop: () => void;
  uploadingUrl: string | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatViews(n: number | null): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function TrendingList({ onUpload, onStop, uploadingUrl }: Props) {
  const [videos, setVideos] = useState<TrendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [includeYtDescription, setIncludeYtDescription] = useState(false);
  const [includeYtLink, setIncludeYtLink] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchTrending()
      .then(setVideos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="trending-loading">
        <span className="spinner" /> Загрузка популярных видео...
      </div>
    );
  }

  if (error) {
    return <div className="trending-error">Ошибка: {error}</div>;
  }

  if (videos.length === 0) {
    return <div className="trending-empty">Нет популярных видео</div>;
  }

  const opts: UploadOptions = {
    ...DEFAULT_UPLOAD_OPTIONS,
    includeYtDescription,
    includeYtLink,
  };

  return (
    <div>
      <div className="meta-section__toggles" style={{ marginBottom: 12 }}>
        <label className="toggle">
          <input
            type="checkbox"
            checked={includeYtDescription}
            onChange={(e) => setIncludeYtDescription(e.target.checked)}
            disabled={uploadingUrl !== null}
          />
          <span className="toggle__label">Описание с YouTube</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={includeYtLink}
            onChange={(e) => setIncludeYtLink(e.target.checked)}
            disabled={uploadingUrl !== null}
          />
          <span className="toggle__label">Добавить ссылку на YouTube</span>
        </label>
      </div>

      <div className="trending-list">
        {videos.map((v) => (
          <div key={v.id} className="trending-card">
            <img
              src={v.thumbnail}
              alt={v.title}
              className="trending-card__thumb"
            />
            <div className="trending-card__info">
              <div className="trending-card__title" title={v.title}>
                {v.title}
              </div>
              <div className="trending-card__meta">
                {v.channel && <span>{v.channel}</span>}
                {v.view_count != null && <span>{formatViews(v.view_count)} просмотров</span>}
                {v.duration != null && <span>{formatDuration(v.duration)}</span>}
              </div>
            </div>
            {uploadingUrl === v.url ? (
              <button className="trending-card__btn btn--stop" onClick={onStop}>
                Остановить
              </button>
            ) : (
              <button
                className="trending-card__btn"
                disabled={uploadingUrl !== null}
                onClick={() => onUpload(v.url, opts)}
              >
                Залить
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
