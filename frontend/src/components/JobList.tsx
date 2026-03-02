import JobCard, { type Job } from "./JobCard.tsx";

interface Props {
  jobs: Job[];
}

export default function JobList({ jobs }: Props) {
  if (jobs.length === 0) return null;

  const done = jobs.filter(
    (j) => j.status === "success" || j.status === "error"
  );
  const successCount = jobs.filter((j) => j.status === "success").length;
  const allDone = done.length === jobs.length;

  return (
    <div className="job-list">
      {allDone && (
        <div className="job-list__summary">
          Загружено {successCount} из {jobs.length}
        </div>
      )}

      {jobs.map((job, i) => (
        <JobCard key={i} job={job} />
      ))}
    </div>
  );
}
