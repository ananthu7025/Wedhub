import { cookies } from "next/headers";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// get access token
export function getAccessToken() {
  return cookies().get(ACCESS_TOKEN_KEY)?.value || null;
}

// set access token
export function setAccessToken(token: string) {
  cookies().set(ACCESS_TOKEN_KEY, token, { httpOnly: true });
}

// get refresh token
export function getRefreshToken() {
  return cookies().get(REFRESH_TOKEN_KEY)?.value || null;
}

// set refresh token
export function setRefreshToken(token: string, expires: Date) {
  cookies().set(REFRESH_TOKEN_KEY, token, { httpOnly: true, expires });
}

// clear all tokens
export function clearTokens() {
  cookies().delete(ACCESS_TOKEN_KEY);
  cookies().delete(REFRESH_TOKEN_KEY);
}
