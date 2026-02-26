from sqlalchemy import Column, Integer, BigInteger
from .base import Base


class GuildSettings(Base):
    __tablename__ = "guild_settings"

    id = Column(Integer, primary_key=True, index=True)
    guild_id = Column(BigInteger, unique=True, index=True, nullable=False)

    # placeholders for later:
    # tier1_role_id = Column(BigInteger, nullable=True)
    # tier2_role_id = Column(BigInteger, nullable=True)
    # tier3_role_id = Column(BigInteger, nullable=True)
    # card_common_role_id = Column(BigInteger, nullable=True)
    # ...

