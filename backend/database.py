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
        conn.execute("""
            CREATE TABLE IF NOT EXISTS vk_session (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                access_token TEXT NOT NULL,
                user_id INTEGER,
                user_name TEXT,
                group_id INTEGER,
                group_name TEXT,
                updated_at REAL NOT NULL
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


# ── VK session ────────────────────────────────────

def _save_vk_session_sync(
    access_token: str,
    user_id: int | None,
    user_name: str | None,
) -> None:
    with _get_conn() as conn:
        conn.execute(
            """
            INSERT INTO vk_session (id, access_token, user_id, user_name, group_id, group_name, updated_at)
            VALUES (1, ?, ?, ?, NULL, NULL, ?)
            ON CONFLICT(id) DO UPDATE SET
                access_token=excluded.access_token,
                user_id=excluded.user_id,
                user_name=excluded.user_name,
                group_id=NULL,
                group_name=NULL,
                updated_at=excluded.updated_at
            """,
            (access_token, user_id, user_name, time.time()),
        )


async def save_vk_session(access_token: str, user_id: int | None, user_name: str | None) -> None:
    await asyncio.to_thread(_save_vk_session_sync, access_token, user_id, user_name)


def _set_vk_group_sync(group_id: int, group_name: str) -> None:
    with _get_conn() as conn:
        conn.execute(
            "UPDATE vk_session SET group_id=?, group_name=?, updated_at=? WHERE id=1",
            (group_id, group_name, time.time()),
        )


async def set_vk_group(group_id: int, group_name: str) -> None:
    await asyncio.to_thread(_set_vk_group_sync, group_id, group_name)


def _get_vk_session_sync() -> dict | None:
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM vk_session WHERE id=1").fetchone()
    return dict(row) if row else None


async def get_vk_session() -> dict | None:
    return await asyncio.to_thread(_get_vk_session_sync)


def _clear_vk_session_sync() -> None:
    with _get_conn() as conn:
        conn.execute("DELETE FROM vk_session WHERE id=1")


async def clear_vk_session() -> None:
    await asyncio.to_thread(_clear_vk_session_sync)


init_db()
