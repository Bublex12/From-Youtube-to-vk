import { useState, type FormEvent } from "react";
import type { UploadOptions, VideoMeta } from "../api.ts";
import { fetchVideoMeta } from "../api.ts";

const YT_URL_RE =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;

const QUALITIES = [
  { value: "360", label: "360p" },
  { value: "480", label: "480p" },
  { value: "720", label: "720p" },
  { value: "1080", label: "1080p" },
];

interface Props {
  onSubmit: (urls: string[], quality: string, options: UploadOptions) => void;
  onStop: () => void;
  disabled: boolean;
}

export default function UrlInput({ onSubmit, onStop, disabled }: Props) {
  const [text, setText] = useState("");
  const [quality, setQuality] = useState("1080");
  const [validationError, setValidationError] = useState("");

  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [includeYtDescription, setIncludeYtDescription] = useState(false);
  const [includeYtLink, setIncludeYtLink] = useState(false);

  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");

  function getUrls(): string[] {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  async function handleFetchMeta() {
    const urls = getUrls();
    if (urls.length !== 1) {
      setMetaError("Вставьте одну ссылку для предпросмотра");
      return;
    }
    if (!YT_URL_RE.test(urls[0])) {
      setMetaError("Некорректная ссылка");
      return;
    }

    setMetaError("");
    setMetaLoading(true);
    setMeta(null);

    try {
      const data = await fetchVideoMeta(urls[0]);
      if (data.error) {
        setMetaError(data.error);
      } else {
        setMeta(data);
        if (!customTitle) setCustomTitle(data.title);
        if (!customDescription && data.description) {
          setCustomDescription(data.description);
        }
      }
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setMetaLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const lines = getUrls();

    if (lines.length === 0) {
      setValidationError("Вставьте хотя бы одну ссылку");
      return;
    }

    const invalid = lines.filter((l) => !YT_URL_RE.test(l));
    if (invalid.length > 0) {
      setValidationError(`Некорректные ссылки:\n${invalid.join("\n")}`);
      return;
    }

    setValidationError("");
    onSubmit(lines, quality, {
      customTitle,
      customDescription,
      includeYtDescription,
      includeYtLink,
    });
  }

  const singleUrl = getUrls().length === 1 && YT_URL_RE.test(getUrls()[0]);

  return (
    <form className="url-input" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setValidationError("");
          setMeta(null);
          setMetaError("");
        }}
        placeholder={
          "Вставьте YouTube ссылки (по одной на строку)\nhttps://youtube.com/watch?v=..."
        }
        rows={3}
        disabled={disabled}
      />

      {singleUrl && !disabled && (
        <button
          type="button"
          className="btn--fetch-meta"
          onClick={handleFetchMeta}
          disabled={metaLoading}
        >
          {metaLoading ? "Загрузка..." : "Получить инфо"}
        </button>
      )}

      {metaError && <div className="validation-error">{metaError}</div>}

      {meta && (
        <div className="meta-preview">
          {meta.thumbnail && (
            <img
              src={meta.thumbnail}
              alt={meta.title}
              className="meta-preview__thumb"
            />
          )}
          <div className="meta-preview__info">
            <div className="meta-preview__title">{meta.title}</div>
            <div className="meta-preview__details">
              {meta.channel && <span>{meta.channel}</span>}
              {meta.duration != null && (
                <span>
                  {Math.floor(meta.duration / 60)}:
                  {(meta.duration % 60).toString().padStart(2, "0")}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="meta-section">
        <input
          type="text"
          className="meta-section__input"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="Название (по умолчанию с YouTube)"
          disabled={disabled}
        />
        <textarea
          className="meta-section__textarea"
          value={customDescription}
          onChange={(e) => setCustomDescription(e.target.value)}
          placeholder="Описание (необязательно)"
          rows={3}
          disabled={disabled}
        />
        <div className="meta-section__toggles">
          <label className="toggle">
            <input
              type="checkbox"
              checked={includeYtDescription}
              onChange={(e) => setIncludeYtDescription(e.target.checked)}
              disabled={disabled}
            />
            <span className="toggle__label">Описание с YouTube</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={includeYtLink}
              onChange={(e) => setIncludeYtLink(e.target.checked)}
              disabled={disabled}
            />
            <span className="toggle__label">Добавить ссылку на YouTube</span>
          </label>
        </div>
      </div>

      <div className="url-input__controls">
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          disabled={disabled}
          className="quality-select"
        >
          {QUALITIES.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </select>

        {disabled ? (
          <button type="button" className="btn--stop" onClick={onStop}>
            Остановить
          </button>
        ) : (
          <button type="submit" disabled={text.trim().length === 0}>
            Загрузить
          </button>
        )}
      </div>

      {validationError && (
        <pre className="validation-error">{validationError}</pre>
      )}
    </form>
  );
}
