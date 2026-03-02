import { useState, useCallback, type FormEvent } from "react";
import type { TrendingVideo } from "../api.ts";
import { fetchChannelVideos, uploadSingleVideo } from "../api.ts";

type QueueStatus = "queued" | "processing" | "success" | "error";

interface QueueItem {
  video: TrendingVideo;
  status: QueueStatus;
  error?: string;
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

export default function ChannelBrowser() {
  const [url, setUrl] = useState("");
  const [videos, setVideos] = useState<TrendingVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setVideos([]);
    setSearched(true);

    fetchChannelVideos(trimmed)
      .then(setVideos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  const queuedIds = new Set(queue.map((q) => q.video.id));

  function addToQueue(video: TrendingVideo) {
    if (queuedIds.has(video.id)) return;
    setQueue((prev) => [...prev, { video, status: "queued" }]);
  }

  function removeFromQueue(id: string) {
    setQueue((prev) => prev.filter((q) => q.video.id !== id || q.status !== "queued"));
  }

  function clearQueue() {
    setQueue((prev) => prev.filter((q) => q.status === "processing"));
  }

  function addAllToQueue() {
    const newItems = videos
      .filter((v) => !queuedIds.has(v.id))
      .map((v) => ({ video: v, status: "queued" as QueueStatus }));
    setQueue((prev) => [...prev, ...newItems]);
  }

  const startUpload = useCallback(async () => {
    setIsUploading(true);

    for (let i = 0; i < queue.length; i++) {
      setQueue((prev) => {
        if (prev[i].status !== "queued") return prev;
        const next = [...prev];
        next[i] = { ...next[i], status: "processing" };
        return next;
      });

      const item = queue[i];
      if (item.status !== "queued") continue;

      try {
        await uploadSingleVideo(item.video.url, "1080");
        setQueue((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], status: "success" };
          return next;
        });
      } catch (err) {
        setQueue((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: "error",
            error: err instanceof Error ? err.message : "Ошибка",
          };
          return next;
        });
      }
    }

    setIsUploading(false);
  }, [queue]);

  const queuedCount = queue.filter((q) => q.status === "queued").length;
  const doneCount = queue.filter(
    (q) => q.status === "success" || q.status === "error"
  ).length;
  const successCount = queue.filter((q) => q.status === "success").length;

  return (
    <div className="channel-browser">
      <form className="channel-browser__form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
          }}
          placeholder="https://youtube.com/@channel или ссылка на канал"
          className="channel-browser__input"
          disabled={loading}
        />
        <button type="submit" disabled={loading || url.trim().length === 0}>
          {loading ? "Загрузка..." : "Найти"}
        </button>
      </form>

      {error && <div className="validation-error">{error}</div>}

      {/* Queue panel */}
      {queue.length > 0 && (
        <div className="queue-panel">
          <div className="queue-panel__header">
            <span className="queue-panel__title">
              Очередь: {queue.length} видео
            </span>
            <div className="queue-panel__actions">
              {!isUploading && queuedCount > 0 && (
                <>
                  <button
                    className="queue-panel__btn queue-panel__btn--start"
                    onClick={startUpload}
                  >
                    Залить всё ({queuedCount})
                  </button>
                  <button
                    className="queue-panel__btn queue-panel__btn--clear"
                    onClick={clearQueue}
                  >
                    Очистить
                  </button>
                </>
              )}
              {isUploading && (
                <span className="badge badge--processing">
                  <span className="spinner" /> Загрузка...
                </span>
              )}
            </div>
          </div>

          {doneCount > 0 && doneCount === queue.length && (
            <div className="queue-panel__summary">
              Загружено {successCount} из {queue.length}
            </div>
          )}

          <div className="queue-list">
            {queue.map((q) => (
              <div
                key={q.video.id}
                className={`queue-item queue-item--${q.status}`}
              >
                <span className="queue-item__title">{q.video.title}</span>
                <span className="queue-item__status">
                  {q.status === "queued" && (
                    <button
                      className="queue-item__remove"
                      onClick={() => removeFromQueue(q.video.id)}
                      title="Убрать"
                    >
                      x
                    </button>
                  )}
                  {q.status === "processing" && <span className="spinner" />}
                  {q.status === "success" && (
                    <span className="badge badge--success">OK</span>
                  )}
                  {q.status === "error" && (
                    <span className="badge badge--error" title={q.error}>
                      Ошибка
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="trending-loading">
          <span className="spinner" /> Загрузка видео канала...
        </div>
      )}

      {!loading && searched && videos.length === 0 && !error && (
        <div className="trending-empty">Видео не найдены</div>
      )}

      {videos.length > 0 && (
        <>
          <div className="channel-browser__toolbar">
            <button
              className="channel-browser__add-all"
              onClick={addAllToQueue}
              disabled={isUploading}
            >
              Добавить все в очередь
            </button>
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
                    {v.view_count != null && (
                      <span>{formatViews(v.view_count)} просмотров</span>
                    )}
                    {v.duration != null && (
                      <span>{formatDuration(v.duration)}</span>
                    )}
                  </div>
                </div>
                <button
                  className={`trending-card__btn ${queuedIds.has(v.id) ? "trending-card__btn--queued" : ""}`}
                  disabled={queuedIds.has(v.id) || isUploading}
                  onClick={() => addToQueue(v)}
                >
                  {queuedIds.has(v.id) ? "В очереди" : "В очередь"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
