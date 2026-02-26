import os
from dotenv import load_dotenv

load_dotenv()


class settings:
    TOKEN = os.getenv("DISCORD_TOKEN")
    APP_ID = int(os.getenv("DISCORD_APP_ID", "0"))
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///luvi.db")
