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
        # SQLAlchemy 2.0 requires text() for raw SQL
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("[DB] Connection OK.")
    except Exception as e:
        logger.error(f"[DB] Connection failed: {e}")
        raise

    logger.info("[DB] Inspecting existing tables...")
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    logger.info(f"[DB] Existing tables: {existing_tables}")

    logger.info("[DB] Creating tables if missing...")
    Base.metadata.create_all(bind=engine)

    logger.info("[DB] Database initialization complete.")
