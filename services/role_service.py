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

    def set_card_role(self, guild_id: int, rarity: str, role_id: int):
        session = SessionLocal()
        rarity = rarity.lower()

        try:
            settings = self.get_or_create_guild(guild_id)

            mapping = {
                "common": "card_common_role_id",
                "rare": "card_rare_role_id",
                "epic": "card_epic_role_id",
                "legendary": "card_legendary_role_id",
            }

            if rarity not in mapping:
                raise ValueError("Invalid rarity. Must be: common, rare, epic, legendary.")

            setattr(settings, mapping[rarity], role_id)

            session.merge(settings)
            session.commit()
            logger.info(f"[RoleService] Updated card rarity '{rarity}' role to {role_id} in guild {guild_id}")
        finally:
            session.close()

    def get_settings(self, guild_id: int) -> GuildSettings:
        return self.get_or_create_guild(guild_id)
