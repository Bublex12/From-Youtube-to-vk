from __future__ import annotations

import asyncio
import logging

import yt_dlp

from . import config

logger = logging.getLogger(__name__)


async def fetch_channel_videos(channel_url: str, limit: int = 50) -> list[dict]:
    return await asyncio.to_thread(_fetch_sync, channel_url, limit)


def _fetch_sync(channel_url: str, limit: int) -> list[dict]:
    logger.info("Fetching channel videos: %s", channel_url)

    url = channel_url.rstrip("/")
    if "/videos" not in url:
        url += "/videos"

    ydl_opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "playlistend": limit,
        "cookiefile": config.YT_COOKIES,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info is None:
                return []
    except Exception as exc:
        logger.error("Failed to fetch channel: %s", exc)
        return []

    entries = info.get("entries") or []
    channel_name = info.get("uploader") or info.get("channel") or ""
    results: list[dict] = []

    for entry in entries[:limit]:
        if not entry:
            continue
        video_id = entry.get("id", "")
        if not video_id:
            continue
        results.append({
            "id": video_id,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "title": entry.get("title", ""),
            "channel": entry.get("uploader") or entry.get("channel") or channel_name,
            "duration": entry.get("duration"),
            "thumbnail": f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg",
            "view_count": entry.get("view_count"),
        })

    logger.info("Fetched %d videos from channel", len(results))
    return results
