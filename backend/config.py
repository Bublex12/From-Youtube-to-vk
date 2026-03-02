from pathlib import Path

from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

VK_APP_ID: str = os.getenv("VK_APP_ID", "")
VK_API_VERSION: str = os.getenv("VK_API_VERSION", "5.131")
DOWNLOAD_DIR: str = os.getenv("DOWNLOAD_DIR", "./tmp")
YT_COOKIES: str = os.getenv("YT_COOKIES", str(Path(__file__).resolve().parent.parent / "cookies.txt"))

Path(DOWNLOAD_DIR).mkdir(parents=True, exist_ok=True)
