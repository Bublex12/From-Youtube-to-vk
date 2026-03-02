from __future__ import annotations

import asyncio
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "history.db"


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                youtube_url TEXT NOT NULL,
                title TEXT,
                vk_video_id TEXT,
                quality TEXT,
                status TEXT NOT NULL,
                error TEXT,
                created_at REAL NOT NULL
            )
        """)


def _save_record_sync(
    youtube_url: str,
    title: str | None,
    vk_video_id: str | None,
    quality: str,
    status: str,
    error: str | None,
) -> int:
    with _get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO history (youtube_url, title, vk_video_id, quality, status, error, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (youtube_url, title, vk_video_id, quality, status, error, time.time()),
        )
        return cur.lastrowid  # type: ignore[return-value]


async def save_record(
    youtube_url: str,
    title: str | None,
    vk_video_id: str | None,
    quality: str,
    status: str,
    error: str | None,
) -> int:
    return await asyncio.to_thread(
        _save_record_sync, youtube_url, title, vk_video_id, quality, status, error
    )


def _get_history_sync(limit: int) -> list[dict]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM history ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


async def get_history(limit: int = 100) -> list[dict]:
    return await asyncio.to_thread(_get_history_sync, limit)


init_db()
