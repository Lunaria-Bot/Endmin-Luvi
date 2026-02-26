from discord.ext import commands
from discord import app_commands
from utils.logger import logger


class AdminCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="ping-admin", description="Admin test command.")
    @app_commands.default_permissions(administrator=True)
    async def ping_admin(self, interaction):
        logger.info(f"/ping-admin used in guild {interaction.guild_id} by {interaction.user.id}")
        await interaction.response.send_message("Admin cog is loaded and working.", ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(AdminCog(bot))
