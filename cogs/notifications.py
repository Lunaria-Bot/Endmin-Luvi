from discord.ext import commands
from discord import app_commands
from utils.logger import logger


class NotificationsCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="ping-notif", description="Notifications test command.")
    async def ping_notif(self, interaction):
        logger.info(f"/ping-notif used in guild {interaction.guild_id} by {interaction.user.id}")
        await interaction.response.send_message("Notifications cog is loaded and working.", ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(NotificationsCog(bot))
