import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Session } from "../db/repo.ts";

export const ACCESS_COOKIE = "dh_at";
export const REFRESH_COOKIE = "dh_rt";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;
// Secure stays on in dev: browsers accept Secure cookies on http://localhost.
const BASE = { httpOnly: true, secure: true, sameSite: "Lax", path: "/api" } as const;

export function setSessionCookies(c: Context, s: Session): void {
  const maxAge = Math.max(1, s.expiresAt - Math.floor(Date.now() / 1000));
  setCookie(c, ACCESS_COOKIE, s.accessToken, { ...BASE, maxAge });
  setCookie(c, REFRESH_COOKIE, s.refreshToken, { ...BASE, maxAge: REFRESH_MAX_AGE });
}

export function clearSessionCookies(c: Context): void {
  deleteCookie(c, ACCESS_COOKIE, BASE);
  deleteCookie(c, REFRESH_COOKIE, BASE);
}

export const readSessionCookies = (c: Context) => ({
  access: getCookie(c, ACCESS_COOKIE),
  refresh: getCookie(c, REFRESH_COOKIE),
});
