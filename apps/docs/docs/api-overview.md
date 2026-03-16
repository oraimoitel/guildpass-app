---
id: api-overview
title: API Overview
---

guildpass-core is the canonical API. The integration client targets minimal endpoints:

- GET /v1/memberships/discord/:discordUserId
- GET /v1/memberships/wallet/:wallet
- POST /v1/verify

Responses:

- Membership: userId, wallet, status, roles, updatedAt
- VerificationResult: userId, wallet, verified, message

Notes:

- The bot does not evaluate policy locally; it trusts core for membership and roles
- Additional endpoints can be added without changing reconciliation patterns
