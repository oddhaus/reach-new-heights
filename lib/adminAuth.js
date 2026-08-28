import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "rnh_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sign(value) {
  return crypto
    .createHmac("sha256", process.env.ADMIN_SECRET)
    .update(value)
    .digest("hex");
}

// Builds a cookie value like "1719999999.signature" -- an expiry timestamp
// plus an HMAC signature, so we don't need a session table in the database.
export function createAdminSessionValue() {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `admin.${expires}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function isValidAdminSessionValue(value) {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [tag, expiresStr, signature] = parts;
  if (tag !== "admin") return false;

  const expires = parseInt(expiresStr, 10);
  if (!expires || Date.now() / 1000 > expires) return false;

  const expected = sign(`admin.${expiresStr}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE = MAX_AGE_SECONDS;

// Convenience for use inside Server Components / Route Handlers.
export async function isAdminRequest() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  return isValidAdminSessionValue(value);
}
