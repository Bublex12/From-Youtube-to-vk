from __future__ import annotations

import asyncio
import logging

import yt_dlp

from . import config

logger = logging.getLogger(__name__)

SEARCH_QUERIES = [
    "ytsearch15:популярные видео 2026 русский",
    "ytsearch15:trending россия",
]


async def fetch_trending(limit: int = 30) -> list[dict]:
    return await asyncio.to_thread(_fetch_sync, limit)


def _fetch_sync(limit: int) -> list[dict]:
    logger.info("Fetching popular RU videos via search...")

    ydl_opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "default_search": "ytsearch",
        "cookiefile": config.YT_COOKIES,
    }

    results: list[dict] = []
    seen_ids: set[str] = set()

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            for query in SEARCH_QUERIES:
                if len(results) >= limit:
                    break
                info = ydl.extract_info(query, download=False)
                if not info:
                    continue
                for entry in info.get("entries") or []:
                    if not entry or len(results) >= limit:
                        continue
                    video_id = entry.get("id", "")
                    if video_id in seen_ids:
                        continue
                    seen_ids.add(video_id)
                    results.append({
                        "id": video_id,
                        "url": f"https://www.youtube.com/watch?v={video_id}",
                        "title": entry.get("title", ""),
                        "channel": entry.get("uploader") or entry.get("channel") or "",
                        "duration": entry.get("duration"),
                        "thumbnail": f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg",
                        "view_count": entry.get("view_count"),
                    })
    except Exception as exc:
        logger.error("Failed to fetch popular videos: %s", exc)

    logger.info("Fetched %d popular videos", len(results))
    return results
