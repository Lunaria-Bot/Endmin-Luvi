from models.base import SessionLocal
from models.guild_settings import GuildSettings
from utils.logger import logger


class RoleService:
    def get_or_create_guild(self, guild_id: int) -> GuildSettings:
        session = SessionLocal()
        try:
            settings = session.query(GuildSettings).filter_by(guild_id=guild_id).first()

            if not settings:
                settings = GuildSettings(guild_id=guild_id)
                session.add(settings)
                session.commit()
                session.refresh(settings)
                logger.info(f"[RoleService] Created GuildSettings for guild {guild_id}")

            return settings
        finally:
            session.close()

    def set_tier_role(self, guild_id: int, tier: int, role_id: int):
        session = SessionLocal()
        try:
            settings = self.get_or_create_guild(guild_id)

            if tier == 1:
                settings.tier1_role_id = role_id
            elif tier == 2:
                settings.tier2_role_id = role_id
            elif tier == 3:
                settings.tier3_role_id = role_id
            else:
                raise ValueError("Tier must be 1, 2, or 3.")

            session.merge(settings)
            session.commit()

            logger.info(f"[RoleService] Updated tier {tier} role to {role_id} in guild {guild_id}")
        finally:
            session.close()

    def get_settings(self, guild_id: int) -> dict:
        session = SessionLocal()
        try:
            settings = session.query(GuildSettings).filter_by(guild_id=guild_id).first()

            if not settings:
                settings = GuildSettings(guild_id=guild_id)
                session.add(settings)
                session.commit()
                session.refresh(settings)
                logger.info(f"[RoleService] Created GuildSettings for guild {guild_id}")

            # Return a SAFE dictionary (no SQLAlchemy object)
            return {
                "tier1_role_id": settings.tier1_role_id,
                "tier2_role_id": settings.tier2_role_id,
                "tier3_role_id": settings.tier3_role_id,
            }
        finally:
            session.close()
