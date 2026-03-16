import type { IntegrationClientOptions, Membership, VerificationResult } from "./types.js";

function headers(apiKey?: string) {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) h["authorization"] = `Bearer ${apiKey}`;
  return h;
}

export class IntegrationClient {
  private baseUrl: string;
  private apiKey?: string;
  constructor(opts: IntegrationClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
  }
  async getMembershipByDiscordUser(discordUserId: string): Promise<Membership | null> {
    const url = `${this.baseUrl}/v1/memberships/discord/${encodeURIComponent(discordUserId)}`;
    const res = await fetch(url, { headers: headers(this.apiKey) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`core:${res.status}`);
    const data = await res.json();
    return data as Membership;
  }
  async getMembershipByWallet(wallet: string): Promise<Membership | null> {
    const url = `${this.baseUrl}/v1/memberships/wallet/${encodeURIComponent(wallet)}`;
    const res = await fetch(url, { headers: headers(this.apiKey) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`core:${res.status}`);
    const data = await res.json();
    return data as Membership;
  }
  async verifyWallet(discordUserId: string, wallet: string): Promise<VerificationResult> {
    const url = `${this.baseUrl}/v1/verify`;
    const res = await fetch(url, {
      method: "POST",
      headers: headers(this.apiKey),
      body: JSON.stringify({ discordUserId, wallet })
    });
    if (!res.ok) throw new Error(`core:${res.status}`);
    const data = await res.json();
    return data as VerificationResult;
  }
}
