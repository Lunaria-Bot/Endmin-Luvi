import discord
from discord.ext import commands
from utils.logger import logger
from config import settings
from models.base import init_db
from cogs.admin import AdminCog
from cogs.notifications import NotificationsCog
from cogs.help import HelpCog
from services.reminder_scheduler import ReminderScheduler


class LuviBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.guilds = True
        intents.members = True

        super().__init__(
            command_prefix="!",
            intents=intents,
            application_id=settings.APP_ID
        )

        # Scheduler instance
        self.scheduler = ReminderScheduler()

    async def setup_hook(self):
        logger.info("Loading cogs...")
        await self.add_cog(AdminCog(self))
        await self.add_cog(NotificationsCog(self))
        await self.add_cog(HelpCog(self))

        logger.info("Starting scheduler...")
        self.scheduler.start()

        logger.info("Syncing application commands...")
        await self.tree.sync()

    async def on_ready(self):
        logger.info(f"Logged in as {self.user} (ID: {self.user.id})")
        logger.info("Bot is ready.")


def main():
    logger.info("Initializing database...")
    init_db()

    bot = LuviBot()
    bot.run(settings.TOKEN)


if __name__ == "__main__":
    main()
