from pathlib import Path

from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

VK_APP_ID: str = os.getenv("VK_APP_ID", "")
VK_ACCESS_TOKEN: str = os.getenv("VK_ACCESS_TOKEN", "") or os.getenv("VK_CLIENT_ID", "")
VK_GROUP_ID: int = int(os.getenv("VK_GROUP_ID", "0"))
VK_API_VERSION: str = os.getenv("VK_API_VERSION", "5.131")
DOWNLOAD_DIR: str = os.getenv("DOWNLOAD_DIR", "./tmp")
YT_COOKIES: str = os.getenv("YT_COOKIES", str(Path(__file__).resolve().parent.parent / "cookies.txt"))

Path(DOWNLOAD_DIR).mkdir(parents=True, exist_ok=True)
