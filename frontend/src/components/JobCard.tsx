export type JobStatus = "pending" | "processing" | "success" | "error";

export interface Job {
  url: string;
  status: JobStatus;
  title?: string | null;
  vkVideoId?: string | null;
  error?: string | null;
}

interface Props {
  job: Job;
}

export default function JobCard({ job }: Props) {
  const thumbUrl = `http://localhost:8000/api/thumbnail?url=${encodeURIComponent(job.url)}`;

  return (
    <div className={`job-card job-card--${job.status}`}>
      <div className="job-card__url" title={job.url}>
        {job.title || job.url}
      </div>

      <div className="job-card__status">
        {job.status === "pending" && (
          <span className="badge badge--pending">Ожидание</span>
        )}

        {job.status === "processing" && (
          <span className="badge badge--processing">
            <span className="spinner" /> В обработке...
          </span>
        )}

        {job.status === "success" && (
          <span className="badge badge--success">
            Успешно
            {job.vkVideoId && (
              <>
                {" — "}
                <a
                  href={`https://vk.com/video${job.vkVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Открыть в VK
                </a>
              </>
            )}
            {" — "}
            <a href={thumbUrl} className="thumb-download">
              Скачать превью
            </a>
          </span>
        )}

        {job.status === "error" && (
          <span className="badge badge--error">
            Ошибка: {job.error}
          </span>
        )}
      </div>
    </div>
  );
}
