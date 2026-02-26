from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings
from utils.logger import logger

engine = create_engine(settings.DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def init_db():
    logger.info("[DB] Checking database connection...")

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("[DB] Connection OK.")
    except Exception as e:
        logger.error(f"[DB] Connection failed: {e}")
        raise

    # IMPORTANT : importer les modèles AVANT create_all()
    from models.guild_settings import GuildSettings
    from models.user_settings import UserSettings

    logger.info("[DB] Creating tables if missing...")
    Base.metadata.create_all(bind=engine)

    logger.info("[DB] Database initialization complete.")
