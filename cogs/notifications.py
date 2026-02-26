from discord.ext import commands
from discord import app_commands, Interaction, Embed
from services.notification_service import NotificationService
from utils.logger import logger


class NotificationsCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.service = NotificationService()

    @app_commands.command(
        name="notifications-set",
        description="Configure your personal notifications."
    )
    @app_commands.describe(
        expedition="Enable expedition notifications.",
        stamina="Enable stamina refill notifications.",
        raid="Enable raid fatigue notifications."
    )
    async def notifications_set(
        self,
        interaction: Interaction,
        expedition: bool,
        stamina: bool,
        raid: bool
    ):
        guild_id = interaction.guild_id
        user_id = interaction.user.id

        self.service.update_notifications(guild_id, user_id, expedition, stamina, raid)

        logger.info(
            f"/notifications-set by user={user_id} guild={guild_id} "
            f"expedition={expedition} stamina={stamina} raid={raid}"
        )

        await interaction.response.send_message(
            "Your notification preferences have been updated.",
            ephemeral=True
        )

    @app_commands.command(
        name="notifications-view",
        description="View your current notification settings."
    )
    async def notifications_view(self, interaction: Interaction):
        guild_id = interaction.guild_id
        user_id = interaction.user.id

        settings = self.service.get_user_settings(guild_id, user_id)

        embed = Embed(
            title="Your Notification Settings",
            color=0x00BFFF
        )

        def fmt(value: bool) -> str:
            return "✅ Enabled" if value else "❌ Disabled"

        embed.add_field(name="Expedition", value=fmt(settings["expedition"]), inline=False)
        embed.add_field(name="Stamina", value=fmt(settings["stamina"]), inline=False)
        embed.add_field(name="Raid", value=fmt(settings["raid"]), inline=False)

        logger.info(f"/notifications-view by user={user_id} guild={guild_id}")

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot):
    await bot.add_cog(NotificationsCog(bot))
