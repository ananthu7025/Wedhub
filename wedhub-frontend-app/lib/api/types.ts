export interface ApiSuccessResponse<T, M = Record<string, unknown>> {
  success: true;
  data: T;
  meta?: M;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ApiResponse<T, M = Record<string, unknown>> = ApiSuccessResponse<T, M> | ApiErrorResponse;

export class ApiRequestError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: Record<string, unknown> | undefined;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Thrown when the request never got a backend error response to unpack —
 * `fetch` itself rejected (offline, DNS failure, CORS) or the response body
 * wasn't valid JSON. Distinct from ApiRequestError, which always carries a
 * real HTTP status/code from the backend; this has neither, since the
 * backend was never actually reached (or its response couldn't be parsed).
 */
export class ApiNetworkError extends Error {
  public readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "ApiNetworkError";
    this.cause = cause;
  }
}
