from sqlalchemy import Column, Integer, BigInteger, Boolean
from .base import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    guild_id = Column(BigInteger, index=True, nullable=False)
    user_id = Column(BigInteger, index=True, nullable=False)

    notify_expedition = Column(Boolean, default=False)
    notify_stamina = Column(Boolean, default=False)
    notify_raid = Column(Boolean, default=False)
    
print(">>> LOADED USER_SETTINGS MODEL <<<")
