import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from "../types/api-response.types";

export function successResponse<T>(
  data: T,
  meta?: Record<string, unknown>,
): ApiSuccessResponse<T> {
  return meta === undefined ? { success: true, data } : { success: true, data, meta };
}

export function paginatedResponse<T>(
  data: T[],
  meta: PaginationMeta,
): ApiSuccessResponse<T[], PaginationMeta> {
  return { success: true, data, meta };
}

export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ApiErrorResponse {
  return details === undefined
    ? { success: false, error: { code, message } }
    : { success: false, error: { code, message, details } };
}
