from __future__ import annotations

import logging

import httpx

from .downloader import DownloadResult

logger = logging.getLogger(__name__)

UPLOAD_TIMEOUT = 1800


class VKUploadError(Exception):
    pass


async def upload_to_vk(
    result: DownloadResult,
    token: str,
    group_id: int,
    api_version: str,
    title: str,
    description: str,
) -> str:
    """Upload a downloaded video to VK and return '{owner_id}_{video_id}'."""

    video_id = await _save_and_upload(result, token, group_id, api_version, title, description)
    owner_id = -group_id
    return f"{owner_id}_{video_id}"


async def _save_and_upload(
    result: DownloadResult,
    token: str,
    group_id: int,
    api_version: str,
    title: str,
    description: str,
) -> int:
    logger.info("VK: calling video.save for '%s'", title)

    save_params: dict = {
        "name": title[:128],
        "description": description[:5000],
        "wallpost": 0,
        "group_id": group_id,
        "access_token": token,
        "v": api_version,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get("https://api.vk.com/method/video.save", params=save_params)
        data = resp.json()

    _check_vk_error(data)

    upload_url: str = data["response"]["upload_url"]
    video_id: int = data["response"]["video_id"]

    logger.info("VK: uploading file to upload_url (video_id=%s)", video_id)

    try:
        async with httpx.AsyncClient(timeout=UPLOAD_TIMEOUT) as client:
            with open(result.video_path, "rb") as f:
                resp = await client.post(upload_url, files={"video_file": ("video.mp4", f, "video/mp4")})
                upload_data = resp.json()
    except httpx.TimeoutException:
        raise VKUploadError("Таймаут загрузки на VK — файл слишком большой или медленное соединение")

    if "error" in upload_data:
        raise VKUploadError(f"VK upload error: {upload_data['error']}")

    logger.info("VK: upload complete, video_id=%s", video_id)
    return video_id


def _check_vk_error(data: dict) -> None:
    if "error" not in data:
        return

    err = data["error"]
    code = err.get("error_code", 0)
    msg = err.get("error_msg", "Unknown VK API error")

    if code == 15:
        raise VKUploadError("Доступ запрещён: проверьте права токена и group_id")
    if code == 214:
        raise VKUploadError("Превышен лимит на количество загружаемых видео")
    raise VKUploadError(f"VK API error {code}: {msg}")
