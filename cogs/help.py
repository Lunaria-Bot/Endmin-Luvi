from discord.ext import commands
from discord import app_commands


class HelpCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="help", description="Show help for Luvi helper.")
    async def help_command(self, interaction):
        content = (
            "Luvi Helper Utility Bot\n\n"
            "/help - Show this message\n"
            "/ping-admin - Test admin cog\n"
            "/ping-notif - Test notifications cog\n"
        )
        await interaction.response.send_message(content, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(HelpCog(bot))
