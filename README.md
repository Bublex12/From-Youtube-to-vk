# From YouTube to VK

Веб-сервис для перезаливки видео с YouTube в группу ВКонтакте. Работает локально: скачивает видео через `yt-dlp`, заливает через VK API.

## Возможности

- Загрузка одного или нескольких видео по ссылкам
- Выбор качества (360p / 480p / 720p / 1080p)
- Просмотр популярных русскоязычных видео с возможностью загрузки
- Просмотр видео канала по ссылке и массовая загрузка через очередь
- Скачивание превью (thumbnail) по ссылке на видео
- История всех загрузок (сохраняется в SQLite)

## Стек

- **Backend:** Python 3.11+, FastAPI, yt-dlp, httpx, SQLite
- **Frontend:** React, TypeScript, Vite
- **Пакетный менеджер Python:** [uv](https://docs.astral.sh/uv/)

## Требования

- Python 3.11+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/)
- [ffmpeg](https://ffmpeg.org/download.html) (нужен для yt-dlp)

## Установка

```bash
# Backend-зависимости
uv sync

# Frontend-зависимости
cd frontend
npm install
```

## Настройка

1. Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

2. Заполните `.env`:

| Переменная | Описание |
|---|---|
| `VK_CLIENT_ID` | Access Token с правами `video` и `offline` |
| `VK_GROUP_ID` | ID группы ВКонтакте (без минуса) |
| `VK_API_VERSION` | Версия VK API (по умолчанию `5.131`) |
| `DOWNLOAD_DIR` | Папка для временных файлов (по умолчанию `./tmp`) |
| `YT_COOKIES` | Путь к файлу cookies в формате Netscape (по умолчанию `./cookies.txt`) |

### Получение VK Access Token

1. Создайте **Standalone-приложение** на [vk.com/dev](https://vk.com/dev)
2. Скопируйте **ID приложения** (`APP_ID`)
3. Перейдите по ссылке (подставьте свой `APP_ID`):

```
https://oauth.vk.com/authorize?client_id=APP_ID&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=video,offline&response_type=token&v=5.131
```

4. Разрешите доступ — из URL скопируйте `access_token`

### Cookies для YouTube

Чтобы обойти ограничения YouTube, нужен файл `cookies.txt` в формате Netscape.
Можно экспортировать из браузера расширением [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) или аналогичным.

## Запуск

```bash
# Backend (из корня проекта)
uv run uvicorn backend.main:app --reload --port 8000

# Frontend (в отдельном терминале)
cd frontend
npm run dev
```

Откройте http://localhost:5173 в браузере.

## Структура проекта

```
├── backend/
│   ├── main.py          # FastAPI-приложение, роуты
│   ├── config.py        # Загрузка конфигурации из .env
│   ├── downloader.py    # Скачивание видео через yt-dlp
│   ├── vk_uploader.py   # Загрузка видео в VK
│   ├── trending.py      # Получение популярных видео
│   ├── channel.py       # Получение видео канала
│   └── database.py      # SQLite: история загрузок
├── frontend/
│   └── src/
│       ├── App.tsx       # Главный компонент с табами
│       ├── api.ts        # API-клиент
│       └── components/   # UI-компоненты
├── .env.example          # Шаблон переменных окружения
├── pyproject.toml        # Python-зависимости (uv)
└── README.md
```
