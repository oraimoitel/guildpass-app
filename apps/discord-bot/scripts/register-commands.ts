import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { config, validateConfig } from "../src/config.js";

const missing = validateConfig();
if (missing.length > 0) {
  console.error("Missing config", missing.join(","));
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder().setName("verify").setDescription("Verify a wallet").addStringOption(o => o.setName("wallet").setDescription("Wallet address").setRequired(true)),
  new SlashCommandBuilder().setName("status").setDescription("Show membership status"),
  new SlashCommandBuilder().setName("refresh-roles").setDescription("Refresh roles from GuildPass")
].map(c => c.toJSON());

async function run() {
  const rest = new REST({ version: "10" }).setToken(config.token);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
  console.log("Registered commands");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
