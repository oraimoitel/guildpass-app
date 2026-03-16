import type { GuildMember } from "discord.js";
import { config } from "./config.js";
import type { Membership } from "@guildpass/integration-client";

export type RoleMap = Record<string, string>;

export function resolveDesiredRoles(m: Membership, map: RoleMap): string[] {
  const desired = new Set<string>();
  for (const r of m.roles) {
    const id = map[r];
    if (id) desired.add(id);
  }
  return Array.from(desired);
}

export async function reconcileMemberRoles(member: GuildMember, desiredRoleIds: string[]) {
  const current = member.roles.cache.map(r => r.id);
  const toAdd = desiredRoleIds.filter(id => !current.includes(id));
  const toRemove = current.filter(id => {
    return [config.roles.admin, config.roles.member, config.roles.contributor].includes(id) && !desiredRoleIds.includes(id);
  });
  if (toAdd.length > 0) await member.roles.add(toAdd);
  if (toRemove.length > 0) await member.roles.remove(toRemove);
  return { added: toAdd, removed: toRemove };
}
