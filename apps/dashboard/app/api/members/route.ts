import { NextResponse } from "next/server";
import {
  apiError,
  apiResponse,
  apiUnsupported,
  apiValidationError,
  handleApiError,
} from "@/lib/api-helpers";
import type { ApiFieldError } from "@/lib/api-contracts";
import { NotFoundError } from "@/lib/api-errors";
import { mockMembers, type Member } from "@/lib/mock-data";
import { MOCK_API_SESSION } from "@/lib/auth/session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";
import { IntegrationClient } from "@guildpass/integration-client";
import { getEnv, getApiMode } from "@/lib/env";
import { getMemberRepository } from "@/lib/repositories/factory";

/**
 * GET /api/members
 * Accessible to all authenticated roles (members:read).
 * In live mode: supports wallet and discordUserId lookups.
 * In mock mode: returns all members from configured repository.
 */
export async function GET(request: Request): Promise<NextResponse> {
  return handleApiError(async () => {
    const apiMode = getApiMode();

    // Allow live lookups by query: ?wallet=0x.. or ?discordUserId=123
    const url = new URL(request.url);
    const wallet = url.searchParams.get("wallet");
    const discordUserId = url.searchParams.get("discordUserId");

    if (apiMode === "live") {
      // Allow injecting a test client via globalThis to avoid making real HTTP calls in tests
      const testClient = (globalThis as any).__TEST_INTEGRATION_CLIENT;
      const env = testClient ? null : getEnv();
      const client =
        testClient ??
        new IntegrationClient({
          baseUrl: env!.GUILD_PASS_CORE_URL as string,
          apiKey: env!.GUILD_PASS_CORE_API_KEY,
        });

      try {
        if (wallet) {
          const m = await client.getMembershipByWallet(wallet);
          if (!m) return apiResponse([], { status: 200 });
          const mapped: Member = {
            id: m.userId,
            wallet: m.wallet ?? "",
            name: m.userId,
            status: m.status === "unknown" ? "pending" : m.status,
            roles: m.roles ?? [],
            joinedAt: m.updatedAt,
            lastActive: m.updatedAt,
          };
          return apiResponse([mapped]);
        }

        if (discordUserId) {
          const m = await client.getMembershipByDiscordUser(discordUserId);
          if (!m) return apiResponse([], { status: 200 });
          const mapped: Member = {
            id: m.userId,
            wallet: m.wallet ?? "",
            name: m.userId,
            status: m.status === "unknown" ? "pending" : m.status,
            roles: m.roles ?? [],
            joinedAt: m.updatedAt,
            lastActive: m.updatedAt,
          };
          return apiResponse([mapped]);
        }

        // We don't support listing all members via the core API here.
        return apiUnsupported(
          "members.list",
          apiMode,
          "Live mode requires a lookup (wallet or discordUserId)"
        );
      } catch (err) {
        console.error("Error fetching membership in live mode:", err);
        return apiError("Failed to retrieve membership from core", 502);
      }
    }

    // Mock mode — return all members from configured repository
    try {
      const memberRepository = getMemberRepository();
      return apiResponse(await memberRepository.getAll());
    } catch (error) {
      console.error("Error fetching members:", error);
      // Fallback to mock data on error
      return apiResponse(mockMembers as Member[]);
    }
  });
}

/**
 * POST /api/members
 * Requires members:write permission (invite / create a member).
 *
 * ⚠️  In production, resolve the session from the request (JWT / cookie)
 *     instead of using MOCK_API_SESSION, then assertPermission against it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "members:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    const body = await request.json();
    const errors = validateMemberCreate(body);
    if (errors.length > 0) {
      return apiValidationError("Invalid member payload", errors);
    }

    const memberRepository = getMemberRepository();
    const now = new Date().toISOString();
    return await memberRepository.create({
      name: body.name.trim(),
      wallet: body.wallet.trim(),
      status: body.status ?? "pending",
      roles: Array.isArray(body.roles) ? body.roles : [],
      joinedAt: body.joinedAt ?? now,
      lastActive: body.lastActive ?? now,
    });
  });
}

/**
 * PATCH /api/members?id=...
 * Requires members:write permission.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "members:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return apiValidationError("Missing member ID", [
      { field: "id", message: "id query parameter is required" },
    ]);
  }

  return handleApiError(async () => {
    const body = await request.json();
    const memberRepository = getMemberRepository();
    const updated = await memberRepository.update(id, body);
    if (!updated) throw new NotFoundError("Member not found.");
    return updated;
  });
}

/**
 * DELETE /api/members?id=...
 * Requires members:write permission (remove a member).
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "members:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return apiValidationError("Missing member ID", [
      { field: "id", message: "id query parameter is required" },
    ]);
  }

  return handleApiError(async () => {
    const memberRepository = getMemberRepository();
    const success = await memberRepository.delete(id);
    if (!success) throw new NotFoundError("Member not found.");
    return { success: true };
  });
}

function validateMemberCreate(body: any): ApiFieldError[] {
  const errors: ApiFieldError[] = [];

  if (typeof body?.name !== "string" || body.name.trim().length === 0) {
    errors.push({ field: "name", message: "name is required" });
  }

  if (typeof body?.wallet !== "string" || body.wallet.trim().length === 0) {
    errors.push({ field: "wallet", message: "wallet is required" });
  }

  if (body?.roles !== undefined && !Array.isArray(body.roles)) {
    errors.push({ field: "roles", message: "roles must be an array" });
  }

  return errors;
}
