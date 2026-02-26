from apscheduler.schedulers.asyncio import AsyncIOScheduler
from utils.logger import logger


class ReminderService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()

    def start(self):
        logger.info("Starting ReminderService scheduler...")
        self.scheduler.start()

    # placeholder for future reminder jobs
