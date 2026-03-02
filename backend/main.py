from __future__ import annotations

import asyncio
import logging
import os
import re
from typing import List, Optional

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from . import config
from .database import save_record, get_history
from .downloader import download_video
from .trending import fetch_trending
from .channel import fetch_channel_videos
from .vk_uploader import upload_to_vk, VKUploadError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="YT-VK Reupload Service")


@app.on_event("startup")
async def _suppress_win_asyncio_bug() -> None:
    """Suppress CPython 3.13 SelectorEventLoop assertion spam on Windows."""
    loop = asyncio.get_running_loop()

    def _handler(loop: asyncio.AbstractEventLoop, context: dict) -> None:
        exc = context.get("exception")
        if isinstance(exc, AssertionError) and "Data should not be empty" in str(exc):
            return
        loop.default_exception_handler(context)

    loop.set_exception_handler(_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class UploadRequest(BaseModel):
    urls: List[str]
    quality: str = "1080"
    custom_title: str = ""
    custom_description: str = ""
    include_yt_description: bool = False
    include_yt_link: bool = False


class UploadResultItem(BaseModel):
    url: str
    status: str
    vk_video_id: Optional[str] = None
    title: Optional[str] = None
    error: Optional[str] = None


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/api/upload", response_model=List[UploadResultItem])
async def upload_videos(body: UploadRequest) -> List[UploadResultItem]:
    results: List[UploadResultItem] = []

    for url in body.urls:
        result_item = await _process_single(
            url,
            body.quality,
            custom_title=body.custom_title,
            custom_description=body.custom_description,
            include_yt_description=body.include_yt_description,
            include_yt_link=body.include_yt_link,
        )
        results.append(result_item)

    return results


@app.get("/api/history")
async def history() -> list[dict]:
    return await get_history()


@app.get("/api/trending")
async def trending() -> list[dict]:
    return await fetch_trending()


@app.get("/api/channel")
async def channel_videos(url: str) -> list[dict]:
    return await fetch_channel_videos(url)


@app.get("/api/meta")
async def video_meta(url: str) -> dict:
    """Fetch YouTube video title and description without downloading."""
    return await asyncio.to_thread(_fetch_meta_sync, url)


def _fetch_meta_sync(url: str) -> dict:
    import yt_dlp

    ydl_opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "cookiefile": config.YT_COOKIES,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info is None:
                return {"title": "", "description": "", "thumbnail": ""}
    except Exception as exc:
        logger.error("Meta fetch failed for %s: %s", url, exc)
        return {"title": "", "description": "", "thumbnail": "", "error": str(exc)}

    video_id = info.get("id", "")
    return {
        "title": info.get("title", ""),
        "description": info.get("description", "") or "",
        "thumbnail": f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg" if video_id else "",
        "duration": info.get("duration"),
        "channel": info.get("uploader") or info.get("channel") or "",
    }


@app.get("/api/thumbnail")
async def thumbnail(url: str) -> Response:
    """Proxy YouTube thumbnail as a downloadable JPEG."""
    video_id = _extract_video_id(url)
    if not video_id:
        return Response(content=b"Invalid URL", status_code=400)

    async with httpx.AsyncClient(timeout=10) as client:
        for quality in ("maxresdefault", "sddefault", "hqdefault"):
            thumb_url = f"https://i.ytimg.com/vi/{video_id}/{quality}.jpg"
            resp = await client.get(thumb_url)
            if resp.status_code == 200 and len(resp.content) > 1000:
                return Response(
                    content=resp.content,
                    media_type="image/jpeg",
                    headers={
                        "Content-Disposition": f'attachment; filename="{video_id}.jpg"',
                    },
                )

    return Response(content=b"Thumbnail not found", status_code=404)


def _extract_video_id(url: str) -> str | None:
    patterns = [
        r"(?:v=|youtu\.be/|shorts/)([a-zA-Z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


def _build_vk_meta(
    dl_title: str,
    dl_description: str,
    source_url: str,
    *,
    custom_title: str,
    custom_description: str,
    include_yt_description: bool,
    include_yt_link: bool,
) -> tuple[str, str]:
    """Build final VK title and description from user options."""
    title = custom_title.strip() if custom_title.strip() else dl_title

    parts: list[str] = []
    if custom_description.strip():
        parts.append(custom_description.strip())
    if include_yt_description and dl_description.strip():
        parts.append(dl_description.strip())
    if include_yt_link:
        parts.append(source_url)

    return title, "\n\n".join(parts)


async def _process_single(
    url: str,
    quality: str = "1080",
    *,
    custom_title: str = "",
    custom_description: str = "",
    include_yt_description: bool = False,
    include_yt_link: bool = False,
) -> UploadResultItem:
    logger.info("=== Processing %s ===", url)

    try:
        dl = await download_video(url, config.DOWNLOAD_DIR, quality)
    except Exception as exc:
        logger.error("Download failed for %s: %s", url, exc)
        await save_record(url, None, None, quality, "error", str(exc))
        return UploadResultItem(url=url, status="error", error=str(exc))

    vk_title, vk_description = _build_vk_meta(
        dl.title, dl.description, url,
        custom_title=custom_title,
        custom_description=custom_description,
        include_yt_description=include_yt_description,
        include_yt_link=include_yt_link,
    )

    try:
        vk_video_id = await upload_to_vk(
            dl, config.VK_CLIENT_ID, config.VK_GROUP_ID, config.VK_API_VERSION,
            title=vk_title, description=vk_description,
        )
    except VKUploadError as exc:
        logger.error("VK upload failed for %s: %s", url, exc)
        await save_record(url, dl.title, None, quality, "error", str(exc))
        return UploadResultItem(url=url, status="error", title=dl.title, error=str(exc))
    except Exception as exc:
        logger.error("Unexpected error uploading to VK: %s", exc)
        await save_record(url, dl.title, None, quality, "error", str(exc))
        return UploadResultItem(url=url, status="error", title=dl.title, error=str(exc))
    finally:
        _cleanup(dl.video_path, dl.thumbnail_path)

    await save_record(url, dl.title, vk_video_id, quality, "success", None)
    logger.info("Success: %s -> %s", url, vk_video_id)
    return UploadResultItem(
        url=url,
        status="success",
        vk_video_id=vk_video_id,
        title=dl.title,
    )


def _cleanup(*paths: str) -> None:
    for path in paths:
        if path and os.path.isfile(path):
            try:
                os.remove(path)
                logger.info("Cleaned up: %s", path)
            except OSError as exc:
                logger.warning("Failed to remove %s: %s", path, exc)
