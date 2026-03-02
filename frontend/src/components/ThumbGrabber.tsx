import { useState, type FormEvent } from "react";

const YT_URL_RE =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;

const VIDEO_ID_RE = /(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/;

function extractId(url: string): string | null {
  const m = url.match(VIDEO_ID_RE);
  return m ? m[1] : null;
}

export default function ThumbGrabber() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!YT_URL_RE.test(trimmed)) {
      setError("Некорректная YouTube ссылка");
      setPreview(null);
      return;
    }
    const id = extractId(trimmed);
    if (!id) {
      setError("Не удалось извлечь ID видео");
      setPreview(null);
      return;
    }
    setError("");
    setPreview(id);
  }

  const downloadUrl = preview
    ? `http://localhost:8000/api/thumbnail?url=https://youtube.com/watch?v=${preview}`
    : null;

  return (
    <div className="thumb-grabber">
      <form className="thumb-grabber__form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
          }}
          placeholder="https://youtube.com/watch?v=..."
          className="thumb-grabber__input"
        />
        <button type="submit" disabled={url.trim().length === 0}>
          Показать
        </button>
      </form>

      {error && <div className="validation-error">{error}</div>}

      {preview && (
        <div className="thumb-grabber__result">
          <img
            src={`https://i.ytimg.com/vi/${preview}/maxresdefault.jpg`}
            alt="Превью"
            className="thumb-grabber__img"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${preview}/hqdefault.jpg`;
            }}
          />
          <a href={downloadUrl!} className="thumb-grabber__download">
            Скачать превью
          </a>
        </div>
      )}
    </div>
  );
}
