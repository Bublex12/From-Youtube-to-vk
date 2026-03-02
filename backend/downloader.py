from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass

import yt_dlp

from . import config

logger = logging.getLogger(__name__)

QUALITY_FORMATS: dict[str, str] = {
    "360":  "bestvideo*[height<=360]+bestaudio/best[height<=360]/bestvideo*+bestaudio/best",
    "480":  "bestvideo*[height<=480]+bestaudio/best[height<=480]/bestvideo*+bestaudio/best",
    "720":  "bestvideo*[height<=720]+bestaudio/best[height<=720]/bestvideo*+bestaudio/best",
    "1080": "bestvideo*[height<=1080]+bestaudio/best[height<=1080]/bestvideo*+bestaudio/best",
}


@dataclass
class DownloadResult:
    video_path: str
    thumbnail_path: str
    title: str
    description: str


async def download_video(url: str, output_dir: str, quality: str = "1080") -> DownloadResult:
    """Download a YouTube video in a thread to avoid blocking the event loop."""
    return await asyncio.to_thread(_download_sync, url, output_dir, quality)


def _download_sync(url: str, output_dir: str, quality: str) -> DownloadResult:
    logger.info("Starting download: %s (quality=%s)", url, quality)

    fmt = QUALITY_FORMATS.get(quality, QUALITY_FORMATS["1080"])
    outtmpl = os.path.join(output_dir, "%(id)s.%(ext)s")

    ydl_opts: dict = {
        "format": fmt,
        "merge_output_format": "mp4",
        "outtmpl": outtmpl,
        "writethumbnail": True,
        "quiet": True,
        "no_warnings": True,
        "cookiefile": config.YT_COOKIES,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if info is None:
                raise RuntimeError(f"Failed to extract info for {url}")
    except yt_dlp.utils.DownloadError as exc:
        logger.error("yt-dlp download error: %s", exc)
        raise RuntimeError(f"Не удалось скачать видео: {exc}") from exc

    video_id: str = info["id"]
    title: str = info.get("title", "")
    description: str = info.get("description", "") or ""

    video_path = os.path.join(output_dir, f"{video_id}.mp4")
    if not os.path.isfile(video_path):
        raise RuntimeError(f"Видеофайл не найден после скачивания: {video_path}")

    thumbnail_path = _find_thumbnail(output_dir, video_id)

    logger.info("Download complete: %s -> %s", title, video_path)

    return DownloadResult(
        video_path=video_path,
        thumbnail_path=thumbnail_path,
        title=title,
        description=description,
    )


def _find_thumbnail(directory: str, video_id: str) -> str:
    for ext in ("jpg", "webp", "png"):
        path = os.path.join(directory, f"{video_id}.{ext}")
        if os.path.isfile(path):
            return path
    return ""
