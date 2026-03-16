# GuildPass Integrations Monorepo

Monorepo for GuildPass ecosystem integrations. It contains an MVP Discord bot and a Docusaurus docs site that treat guildpass-core as the source of truth for membership and roles.

## Structure

- apps/discord-bot — MVP Discord bot
- apps/docs — Docusaurus documentation site
- packages/integration-client — typed client for guildpass-core
- packages/webhook-utils — lightweight webhook verification stubs

## Prerequisites

- Node 18+
- A Discord application with a bot token and the applications.commands scope

## Install

```bash
npm install
```

## Environment

Create a `.env` in the repository root or `apps/discord-bot` with:

```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
GUILD_PASS_CORE_URL=
GUILD_PASS_CORE_API_KEY=
DISCORD_ROLE_ADMIN=
DISCORD_ROLE_MEMBER=
DISCORD_ROLE_CONTRIBUTOR=
```

## Register Commands

```bash
npm run register:commands
```

## Run the Bot

```bash
npm run dev:bot
```

Commands:

- /verify wallet — simple wallet verification placeholder that calls core
- /status — show current membership and roles from core
- /refresh-roles — reconcile roles in Discord to the state from core

## Run the Docs

```bash
npm run dev:docs
```

## Design Notes

- Policy and eligibility logic live in guildpass-core
- The bot reads membership and roles from core and updates Discord
- Only a small role set is supported: admin, member, contributor
- Logs are concise and audit-friendly in the server console

## Deferred Areas

- Advanced moderation, appeals, and case management
- Rich notifications and escalation workflows
- Complex role sync rules or schedule-based sync
- Multi-platform chat and event integrations
- DAO governance tooling and on-chain orchestration
- A robust webhook ecosystem with retries and signatures

Interfaces and stubs are included to show boundaries and extension points.
