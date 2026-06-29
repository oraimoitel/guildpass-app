import { NextResponse } from "next/server";
import type {
  ApiErrorCode,
  ApiErrorResponse,
  ApiFieldError,
  ApiResult,
  ApiSuccess,
  ApiUnsupportedResponse,
  ApiValidationErrorResponse,
} from "./api-contracts";

export function apiResponse<T>(
  data: T,
  init?: ResponseInit
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiError(
  message: string,
  status: number = 500,
  code: ApiErrorCode = inferErrorCode(status)
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ ok: false, code, error: message }, { status });
}

export function apiValidationError(
  message: string,
  fields: ApiFieldError[],
  status: number = 400
): NextResponse<ApiValidationErrorResponse> {
  return NextResponse.json(
    { ok: false, code: "VALIDATION_ERROR", error: message, fields },
    { status }
  );
}

export function apiUnsupported(
  feature: string,
  mode: string,
  message: string
): NextResponse<ApiUnsupportedResponse> {
  return NextResponse.json(
    {
      ok: false,
      code: "UNSUPPORTED",
      error: message,
      unsupported: { feature, mode },
    },
    { status: 501 }
  );
}

export async function handleApiError<T>(
  fn: () => Promise<T | NextResponse>
): Promise<NextResponse<ApiResult<T>>> {
  try {
    const data = await fn();
    if (data instanceof Response) {
      return data as NextResponse<ApiResult<T>>;
    }

    return apiResponse(data);
  } catch (err) {
    console.error("API Error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return apiError(message, 500);
  }
}

function inferErrorCode(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 502) return "UPSTREAM_ERROR";
  if (status >= 500) return "SERVER_ERROR";
  return "BAD_REQUEST";
}
