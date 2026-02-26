from discord.ext import commands
from discord import app_commands, Interaction, Role, Embed
from utils.logger import logger
from services.role_service import RoleService


class AdminCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.role_service = RoleService()

    @app_commands.command(
        name="set-tier-role",
        description="Set a role for a boss tier (1, 2 or 3)."
    )
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(
        tier="Tier to configure (1, 2 or 3).",
        role="Discord role to associate with this tier."
    )
    async def set_tier_role(self, interaction: Interaction, tier: int, role: Role):
        guild_id = interaction.guild_id

        if tier not in [1, 2, 3]:
            await interaction.response.send_message(
                "Invalid tier. Please choose 1, 2 or 3.",
                ephemeral=True
            )
            return

        self.role_service.set_tier_role(guild_id, tier, role.id)

        logger.info(
            f"/set-tier-role tier={tier} role={role.id} "
            f"by user={interaction.user.id} guild={guild_id}"
        )

        await interaction.response.send_message(
            f"Tier **{tier}** has been set to role {role.mention}.",
            ephemeral=True
        )

    @app_commands.command(
        name="view-settings",
        description="View current tier role configuration for this server."
    )
    @app_commands.default_permissions(administrator=True)
    async def view_settings(self, interaction: Interaction):
        guild_id = interaction.guild_id
        settings = self.role_service.get_settings(guild_id)

        embed = Embed(
            title="Tier Role Configuration",
            color=0x5865F2,
        )

        def fmt(role_id: int | None) -> str:
            return f"<@&{role_id}>" if role_id else "❌ Not set"

        embed.add_field(name="Tier 1", value=fmt(settings["tier1_role_id"]), inline=False)
        embed.add_field(name="Tier 2", value=fmt(settings["tier2_role_id"]), inline=False)
        embed.add_field(name="Tier 3", value=fmt(settings["tier3_role_id"]), inline=False)

        logger.info(f"/view-settings used by user={interaction.user.id} guild={guild_id}")

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(AdminCog(bot))
