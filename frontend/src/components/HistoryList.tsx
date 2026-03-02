import { useEffect, useState } from "react";
import type { HistoryItem } from "../api.ts";
import { fetchHistory } from "../api.ts";

export default function HistoryList() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="history-loading">
        <span className="spinner" /> Загрузка истории...
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="history-empty">История пуста</div>;
  }

  return (
    <div className="history-list">
      {items.map((item) => (
        <div
          key={item.id}
          className={`history-card history-card--${item.status}`}
        >
          <div className="history-card__title">
            {item.title || item.youtube_url}
          </div>
          <div className="history-card__meta">
            <span className="history-card__quality">{item.quality}p</span>
            <span className="history-card__date">
              {new Date(item.created_at * 1000).toLocaleString("ru-RU")}
            </span>
            {item.status === "success" && item.vk_video_id && (
              <a
                href={`https://vk.com/video${item.vk_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                VK
              </a>
            )}
            {item.status === "success" && (
              <a
                href={`http://localhost:8000/api/thumbnail?url=${encodeURIComponent(item.youtube_url)}`}
                className="thumb-download"
              >
                Превью
              </a>
            )}
            {item.status === "error" && (
              <span className="history-card__error" title={item.error || ""}>
                Ошибка
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
