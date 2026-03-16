import dotenv from "dotenv";
dotenv.config();

export const config = {
  token: process.env.DISCORD_TOKEN ?? "",
  clientId: process.env.DISCORD_CLIENT_ID ?? "",
  guildId: process.env.DISCORD_GUILD_ID ?? "",
  coreBaseUrl: process.env.GUILD_PASS_CORE_URL ?? "",
  coreApiKey: process.env.GUILD_PASS_CORE_API_KEY ?? "",
  roles: {
    admin: process.env.DISCORD_ROLE_ADMIN ?? "",
    member: process.env.DISCORD_ROLE_MEMBER ?? "",
    contributor: process.env.DISCORD_ROLE_CONTRIBUTOR ?? ""
  }
};

export function validateConfig(): string[] {
  const missing: string[] = [];
  if (!config.token) missing.push("DISCORD_TOKEN");
  if (!config.clientId) missing.push("DISCORD_CLIENT_ID");
  if (!config.guildId) missing.push("DISCORD_GUILD_ID");
  if (!config.coreBaseUrl) missing.push("GUILD_PASS_CORE_URL");
  return missing;
}
