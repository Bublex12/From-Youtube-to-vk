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
        result_item = await _process_single(url, body.quality)
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


async def _process_single(url: str, quality: str = "1080") -> UploadResultItem:
    logger.info("=== Processing %s ===", url)

    try:
        dl = await download_video(url, config.DOWNLOAD_DIR, quality)
    except Exception as exc:
        logger.error("Download failed for %s: %s", url, exc)
        await save_record(url, None, None, quality, "error", str(exc))
        return UploadResultItem(url=url, status="error", error=str(exc))

    try:
        vk_video_id = await upload_to_vk(dl, config.VK_CLIENT_ID, config.VK_GROUP_ID, config.VK_API_VERSION, url)
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
