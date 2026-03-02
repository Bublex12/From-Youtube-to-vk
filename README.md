# From YouTube to VK

Веб-сервис для перезаливки видео с YouTube в группу ВКонтакте. Работает локально: скачивает видео через `yt-dlp`, заливает через VK API.

## Возможности

- **Авторизация через ВКонтакте** — OAuth логин, выбор группы из списка
- Загрузка одного или нескольких видео по ссылкам
- Настраиваемое название и описание для VK
- Выбор качества (360p / 480p / 720p / 1080p)
- Предпросмотр метаданных видео перед загрузкой
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
| `VK_APP_ID` | ID VK-приложения (числовой, см. ниже) |
| `VK_API_VERSION` | Версия VK API (по умолчанию `5.131`) |
| `DOWNLOAD_DIR` | Папка для временных файлов (по умолчанию `./tmp`) |
| `YT_COOKIES` | Путь к файлу cookies в формате Netscape (по умолчанию `./cookies.txt`) |

### Создание VK-приложения

1. Перейдите на [vk.com/dev](https://vk.com/dev) и создайте **Standalone-приложение**
2. Скопируйте числовой **ID приложения** — это `VK_APP_ID`
3. В настройках приложения добавьте **Redirect URI**: `http://localhost:5173/callback`

Токен и группа выбираются через веб-интерфейс — в `.env` их указывать не нужно.

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

## Использование

1. Нажмите **«Войти через ВКонтакте»** и авторизуйтесь
2. Выберите группу из списка
3. Используйте вкладки для загрузки видео

## Структура проекта

```
├── backend/
│   ├── main.py          # FastAPI-приложение, роуты + VK OAuth
│   ├── config.py        # Загрузка конфигурации из .env
│   ├── downloader.py    # Скачивание видео через yt-dlp
│   ├── vk_uploader.py   # Загрузка видео в VK
│   ├── trending.py      # Получение популярных видео
│   ├── channel.py       # Получение видео канала
│   └── database.py      # SQLite: история + VK-сессия
├── frontend/
│   └── src/
│       ├── App.tsx       # Главный компонент с авторизацией
│       ├── api.ts        # API-клиент
│       └── components/   # UI-компоненты
├── .env.example          # Шаблон переменных окружения
├── pyproject.toml        # Python-зависимости (uv)
└── README.md
```
