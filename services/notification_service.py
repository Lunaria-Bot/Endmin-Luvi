from models.base import SessionLocal
from models.user_settings import UserSettings
from utils.logger import logger


class NotificationService:
    def get_or_create_user(self, guild_id: int, user_id: int) -> UserSettings:
        session = SessionLocal()
        try:
            settings = (
                session.query(UserSettings)
                .filter_by(guild_id=guild_id, user_id=user_id)
                .first()
            )

            if not settings:
                settings = UserSettings(
                    guild_id=guild_id,
                    user_id=user_id
                )
                session.add(settings)
                session.commit()
                session.refresh(settings)
                logger.info(f"[NotificationService] Created UserSettings for user {user_id} in guild {guild_id}")

            return settings
        finally:
            session.close()

    def update_notifications(self, guild_id: int, user_id: int, expedition: bool, stamina: bool, raid: bool):
        session = SessionLocal()
        try:
            settings = self.get_or_create_user(guild_id, user_id)

            settings.notify_expedition = expedition
            settings.notify_stamina = stamina
            settings.notify_raid = raid

            session.merge(settings)
            session.commit()

            logger.info(
                f"[NotificationService] Updated notifications for user {user_id} "
                f"in guild {guild_id}: expedition={expedition}, stamina={stamina}, raid={raid}"
            )
        finally:
            session.close()

    def get_user_settings(self, guild_id: int, user_id: int) -> dict:
        session = SessionLocal()
        try:
            settings = (
                session.query(UserSettings)
                .filter_by(guild_id=guild_id, user_id=user_id)
                .first()
            )

            if not settings:
                settings = UserSettings(guild_id=guild_id, user_id=user_id)
                session.add(settings)
                session.commit()
                session.refresh(settings)

            return {
                "expedition": settings.notify_expedition,
                "stamina": settings.notify_stamina,
                "raid": settings.notify_raid,
            }
        finally:
            session.close()
