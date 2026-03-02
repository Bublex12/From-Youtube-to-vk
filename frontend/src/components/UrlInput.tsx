import { useState, type FormEvent } from "react";

const YT_URL_RE =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;

const QUALITIES = [
  { value: "360", label: "360p" },
  { value: "480", label: "480p" },
  { value: "720", label: "720p" },
  { value: "1080", label: "1080p" },
];

interface Props {
  onSubmit: (urls: string[], quality: string) => void;
  disabled: boolean;
}

export default function UrlInput({ onSubmit, disabled }: Props) {
  const [text, setText] = useState("");
  const [quality, setQuality] = useState("1080");
  const [validationError, setValidationError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

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
    onSubmit(lines, quality);
  }

  return (
    <form className="url-input" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setValidationError("");
        }}
        placeholder={
          "Вставьте YouTube ссылки (по одной на строку)\nhttps://youtube.com/watch?v=..."
        }
        rows={5}
        disabled={disabled}
      />

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

        <button type="submit" disabled={disabled || text.trim().length === 0}>
          {disabled ? "Обработка..." : "Загрузить"}
        </button>
      </div>

      {validationError && (
        <pre className="validation-error">{validationError}</pre>
      )}
    </form>
  );
}
