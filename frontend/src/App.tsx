import { useState, useCallback, useRef, useEffect } from "react";
import UrlInput from "./components/UrlInput.tsx";
import JobList from "./components/JobList.tsx";
import TrendingList from "./components/TrendingList.tsx";
import HistoryList from "./components/HistoryList.tsx";
import ThumbGrabber from "./components/ThumbGrabber.tsx";
import ChannelBrowser from "./components/ChannelBrowser.tsx";
import VkAuth from "./components/VkAuth.tsx";
import type { Job } from "./components/JobCard.tsx";
import {
  uploadSingleVideo,
  type UploadOptions,
  type VkSession,
  DEFAULT_UPLOAD_OPTIONS,
  fetchVkSession,
  sendVkToken,
} from "./api.ts";
import "./App.css";

type Tab = "upload" | "channel" | "trending" | "thumbs" | "history";

export default function App() {
  const [tab, setTab] = useState<Tab>("upload");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [processing, setProcessing] = useState(false);
  const [uploadingTrendingUrl, setUploadingTrendingUrl] = useState<
    string | null
  >(null);

  const [vkSession, setVkSession] = useState<VkSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      const userId = params.get("user_id");

      if (token) {
        window.history.replaceState(null, "", window.location.pathname);
        sendVkToken(token, userId ? parseInt(userId) : null).then(() => {
          fetchVkSession().then((s) => {
            setVkSession(s);
            setAuthLoading(false);
          });
        });
        return;
      }
    }

    fetchVkSession().then((s) => {
      setVkSession(s);
      setAuthLoading(false);
    });
  }, []);

  const abortRef = useRef<AbortController | null>(null);
  const trendingAbortRef = useRef<AbortController | null>(null);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const handleSubmit = useCallback(
    async (urls: string[], quality: string, options: UploadOptions) => {
      const ac = new AbortController();
      abortRef.current = ac;
      setProcessing(true);

      const initial: Job[] = urls.map((url) => ({
        url,
        status: "pending",
      }));
      setJobs(initial);

      for (let i = 0; i < urls.length; i++) {
        if (ac.signal.aborted) {
          setJobs((prev) =>
            prev.map((j, idx) =>
              idx >= i && j.status === "pending"
                ? { ...j, status: "error", error: "Остановлено" }
                : j
            )
          );
          break;
        }

        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i ? { ...j, status: "processing" } : j
          )
        );

        try {
          const result = await uploadSingleVideo(urls[i], quality, ac.signal, options);
          setJobs((prev) =>
            prev.map((j, idx) =>
              idx === i
                ? {
                    ...j,
                    status: result.status,
                    title: result.title,
                    vkVideoId: result.vk_video_id,
                    error: result.error,
                  }
                : j
            )
          );
        } catch (err) {
          const isAbort = err instanceof DOMException && err.name === "AbortError";
          setJobs((prev) =>
            prev.map((j, idx) => {
              if (idx === i) {
                return { ...j, status: "error", error: isAbort ? "Остановлено" : (err instanceof Error ? err.message : "Неизвестная ошибка") };
              }
              if (isAbort && idx > i && j.status === "pending") {
                return { ...j, status: "error", error: "Остановлено" };
              }
              return j;
            })
          );
          if (isAbort) break;
        }
      }

      abortRef.current = null;
      setProcessing(false);
    },
    []
  );

  const handleTrendingUpload = useCallback(
    async (url: string, options?: UploadOptions) => {
      const ac = new AbortController();
      trendingAbortRef.current = ac;
      setUploadingTrendingUrl(url);
      try {
        await uploadSingleVideo(url, "1080", ac.signal, options ?? DEFAULT_UPLOAD_OPTIONS);
      } catch {
        // ignore — will be in history
      }
      trendingAbortRef.current = null;
      setUploadingTrendingUrl(null);
    },
    []
  );

  const handleTrendingStop = useCallback(() => {
    trendingAbortRef.current?.abort();
  }, []);

  const isReady = vkSession?.logged_in && vkSession.group_id != null;

  return (
    <div className="app">
      <header className="app__header">
        <h1>YT → VK</h1>
        <p>Перезаливка видео с YouTube на ВКонтакте</p>
      </header>

      {authLoading ? (
        <div className="trending-loading">
          <span className="spinner" /> Загрузка...
        </div>
      ) : (
        <>
          <VkAuth session={vkSession} onSessionChange={setVkSession} />

          {isReady && (
            <>
              <nav className="tabs">
                <button
                  className={`tabs__btn ${tab === "upload" ? "tabs__btn--active" : ""}`}
                  onClick={() => setTab("upload")}
                >
                  Загрузка
                </button>
                <button
                  className={`tabs__btn ${tab === "channel" ? "tabs__btn--active" : ""}`}
                  onClick={() => setTab("channel")}
                >
                  Канал
                </button>
                <button
                  className={`tabs__btn ${tab === "trending" ? "tabs__btn--active" : ""}`}
                  onClick={() => setTab("trending")}
                >
                  Популярное
                </button>
                <button
                  className={`tabs__btn ${tab === "thumbs" ? "tabs__btn--active" : ""}`}
                  onClick={() => setTab("thumbs")}
                >
                  Превью
                </button>
                <button
                  className={`tabs__btn ${tab === "history" ? "tabs__btn--active" : ""}`}
                  onClick={() => setTab("history")}
                >
                  История
                </button>
              </nav>

              <main className="app__main">
                {tab === "upload" && (
                  <>
                    <UrlInput
                      onSubmit={handleSubmit}
                      onStop={handleStop}
                      disabled={processing}
                    />
                    <JobList jobs={jobs} />
                  </>
                )}

                {tab === "channel" && <ChannelBrowser />}

                {tab === "trending" && (
                  <TrendingList
                    onUpload={handleTrendingUpload}
                    onStop={handleTrendingStop}
                    uploadingUrl={uploadingTrendingUrl}
                  />
                )}

                {tab === "thumbs" && <ThumbGrabber />}

                {tab === "history" && <HistoryList />}
              </main>
            </>
          )}
        </>
      )}
    </div>
  );
}
