import { NextResponse } from "next/server";
import {
  apiError,
  apiUnsupported,
  apiValidationError,
  handleApiError,
} from "@/lib/api-helpers";
import type { ApiFieldError } from "@/lib/api-contracts";
import { mockPasses, type Pass } from "@/lib/mock-data";
import { MOCK_API_SESSION } from "@/lib/auth/session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";
import { getApiMode } from "@/lib/env";
import { getPassRepository } from "@/lib/repositories/factory";

/**
 * GET /api/passes
 * Accessible to all authenticated roles (passes:read).
 * Fetches from the configured repository (mock or durable).
 */
export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    const apiMode = getApiMode();

    if (apiMode === "live") {
      // IntegrationClient currently does not expose pass listing.
      return apiUnsupported(
        "passes.list",
        apiMode,
        "Pass listing in live mode is not implemented"
      );
    }

    try {
      const passRepository = getPassRepository();
      return await passRepository.getAll();
    } catch (error) {
      console.error("Error fetching passes:", error);
      // Fallback to mock data on error
      return mockPasses as Pass[];
    }
  });
}

/**
 * POST /api/passes
 * Requires passes:write permission.
 *
 * ⚠️  In production, resolve the session from the request (JWT / cookie)
 *     instead of using MOCK_API_SESSION, then assertPermission against it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "passes:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    const body = await request.json();
    const errors = validatePassCreate(body);
    if (errors.length > 0) {
      return apiValidationError("Invalid pass payload", errors);
    }

    const passRepository = getPassRepository();
    return await passRepository.create({
      name: body.name.trim(),
      description: body.description.trim(),
      status: body.status ?? "draft",
      price: body.price,
      maxSupply: body.maxSupply ?? null,
      currentSupply: body.currentSupply ?? 0,
    });
  });
}

/**
 * PATCH /api/passes?id=...
 * Requires passes:write permission.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "passes:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return apiValidationError("Missing pass ID", [
      { field: "id", message: "id query parameter is required" },
    ]);
  }

  return handleApiError(async () => {
    const body = await request.json();
    const passRepository = getPassRepository();
    const updated = await passRepository.update(id, body);
    if (!updated) throw new Error("Pass not found or update failed");
    return updated;
  });
}

/**
 * DELETE /api/passes?id=...
 * Requires passes:write permission.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "passes:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return apiValidationError("Missing pass ID", [
      { field: "id", message: "id query parameter is required" },
    ]);
  }

  return handleApiError(async () => {
    const passRepository = getPassRepository();
    const success = await passRepository.delete(id);
    if (!success) throw new Error("Pass not found or deletion failed");
    return { success: true };
  });
}

function validatePassCreate(body: any): ApiFieldError[] {
  const errors: ApiFieldError[] = [];

  if (typeof body?.name !== "string" || body.name.trim().length === 0) {
    errors.push({ field: "name", message: "name is required" });
  }

  if (
    typeof body?.description !== "string" ||
    body.description.trim().length === 0
  ) {
    errors.push({ field: "description", message: "description is required" });
  }

  if (body?.price !== undefined && typeof body.price !== "number") {
    errors.push({ field: "price", message: "price must be a number" });
  }

  if (body?.maxSupply !== undefined && body.maxSupply !== null) {
    if (!Number.isInteger(body.maxSupply) || body.maxSupply < 0) {
      errors.push({
        field: "maxSupply",
        message: "maxSupply must be a non-negative integer",
      });
    }
  }

  return errors;
}
