# From YouTube to VK

Веб-сервис для перезаливки видео с YouTube в группу ВКонтакте. Работает локально: скачивает видео через `yt-dlp`, заливает через VK API.

## Возможности

- **Два способа авторизации ВКонтакте** — OAuth через веб-интерфейс или токен в `.env`
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
| `VK_APP_ID` | ID VK-приложения для OAuth (см. ниже) |
| `VK_ACCESS_TOKEN` | *(необязательно)* Токен VK напрямую (альтернатива OAuth) |
| `VK_GROUP_ID` | *(необязательно)* ID группы VK (при использовании токена) |
| `VK_API_VERSION` | Версия VK API (по умолчанию `5.131`) |
| `DOWNLOAD_DIR` | Папка для временных файлов (по умолчанию `./tmp`) |
| `YT_COOKIES` | Путь к файлу cookies в формате Netscape (по умолчанию `./cookies.txt`) |

### Вариант 1: OAuth через веб-интерфейс (рекомендуется)

1. Перейдите на [vk.com/dev](https://vk.com/dev) и создайте **Standalone-приложение**
2. Скопируйте числовой **ID приложения** — это `VK_APP_ID`
3. В настройках приложения добавьте **Redirect URI**: `http://localhost:5173/callback`
4. Укажите `VK_APP_ID` в `.env`, запустите сервис и авторизуйтесь через кнопку в интерфейсе

### Вариант 2: токен вручную (без OAuth)

Если не хотите настраивать OAuth-приложение, можно указать токен и группу напрямую:

```env
VK_ACCESS_TOKEN=vk1.a.xxxxx
VK_GROUP_ID=123456789
```

В этом случае `VK_APP_ID` не нужен — авторизация в интерфейсе будет пропущена.

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

**OAuth:** Нажмите «Войти через ВКонтакте» → выберите группу → используйте вкладки

**Токен из .env:** Если `VK_ACCESS_TOKEN` и `VK_GROUP_ID` заданы — сервис сразу готов к работе

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
