import { Client, GatewayIntentBits, Interaction, REST, Routes, SlashCommandBuilder } from "discord.js";
import { config, validateConfig } from "./config.js";
import { IntegrationClient } from "@guildpass/integration-client";
import { resolveDesiredRoles, reconcileMemberRoles } from "./roles.js";

const missing = validateConfig();
if (missing.length > 0) {
  console.error("Missing config", missing.join(","));
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const core = new IntegrationClient({ baseUrl: config.coreBaseUrl, apiKey: config.coreApiKey });

const Commands = {
  verify: new SlashCommandBuilder().setName("verify").setDescription("Verify a wallet").addStringOption(o => o.setName("wallet").setDescription("Wallet address").setRequired(true)),
  status: new SlashCommandBuilder().setName("status").setDescription("Show membership status"),
  refresh: new SlashCommandBuilder().setName("refresh-roles").setDescription("Refresh roles from GuildPass")
};

client.once("ready", async () => {
  console.log("Bot ready", client.user?.tag);
});

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "verify") {
    const wallet = interaction.options.getString("wallet", true);
    await interaction.reply({ content: "Verifying wallet", ephemeral: true });
    try {
      const res = await core.verifyWallet(interaction.user.id, wallet);
      if (!res.verified) {
        await interaction.followUp({ content: "Verification failed", ephemeral: true });
        return;
      }
      const membership = await core.getMembershipByDiscordUser(interaction.user.id);
      if (!membership) {
        await interaction.followUp({ content: "No membership found", ephemeral: true });
        return;
      }
      const map = { admin: config.roles.admin, member: config.roles.member, contributor: config.roles.contributor };
      if (interaction.guildId) {
        const m = await interaction.guild?.members.fetch(interaction.user.id);
        if (m) {
          const desired = resolveDesiredRoles(membership, map);
          const diff = await reconcileMemberRoles(m, desired);
          console.log("verify", interaction.user.id, membership.status, membership.roles, diff);
        }
      }
      await interaction.followUp({ content: "Verification complete", ephemeral: true });
    } catch (e: any) {
      console.error("verify_error", e?.message ?? String(e));
      await interaction.followUp({ content: "Verification error", ephemeral: true });
    }
    return;
  }
  if (interaction.commandName === "status") {
    await interaction.reply({ content: "Fetching status", ephemeral: true });
    try {
      const membership = await core.getMembershipByDiscordUser(interaction.user.id);
      if (!membership) {
        await interaction.followUp({ content: "No membership found", ephemeral: true });
        return;
      }
      const info = `status=${membership.status} roles=${membership.roles.join(",")}`;
      console.log("status", interaction.user.id, info);
      await interaction.followUp({ content: info, ephemeral: true });
    } catch (e: any) {
      console.error("status_error", e?.message ?? String(e));
      await interaction.followUp({ content: "Status error", ephemeral: true });
    }
    return;
  }
  if (interaction.commandName === "refresh-roles") {
    await interaction.reply({ content: "Refreshing roles", ephemeral: true });
    try {
      const membership = await core.getMembershipByDiscordUser(interaction.user.id);
      if (!membership) {
        await interaction.followUp({ content: "No membership found", ephemeral: true });
        return;
      }
      if (!interaction.guildId) {
        await interaction.followUp({ content: "Run in a server", ephemeral: true });
        return;
      }
      const m = await interaction.guild?.members.fetch(interaction.user.id);
      if (!m) {
        await interaction.followUp({ content: "Member not found", ephemeral: true });
        return;
      }
      const map = { admin: config.roles.admin, member: config.roles.member, contributor: config.roles.contributor };
      const desired = resolveDesiredRoles(membership, map);
      const diff = await reconcileMemberRoles(m, desired);
      console.log("refresh", interaction.user.id, membership.status, membership.roles, diff);
      await interaction.followUp({ content: "Roles reconciled", ephemeral: true });
    } catch (e: any) {
      console.error("refresh_error", e?.message ?? String(e));
      await interaction.followUp({ content: "Refresh error", ephemeral: true });
    }
    return;
  }
});

async function ensureCommands() {
  const rest = new REST({ version: "10" }).setToken(config.token);
  const body = [Commands.verify, Commands.status, Commands.refresh].map(c => c.toJSON());
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
}

ensureCommands().then(() => {
  client.login(config.token);
});
