from apscheduler.schedulers.asyncio import AsyncIOScheduler
from utils.logger import logger


class ReminderScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()

    def start(self):
        logger.info("[ReminderScheduler] Starting scheduler...")
        self.scheduler.start()

    # Jobs will be added later
