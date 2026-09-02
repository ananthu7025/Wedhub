/** Holds only the backend's short-lived access token (15 min TTL) — never the refresh token. */
export const SESSION_COOKIE_NAME = "wedhub_session";

/** Set directly by the backend on /api/v1/auth/* responses; we forward it through our own Route Handlers. */
export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
