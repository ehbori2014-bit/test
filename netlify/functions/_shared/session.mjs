import crypto from "node:crypto";

export const SESSION_COOKIE = "nexfive_session";
export const OAUTH_STATE_COOKIE = "nexfive_oauth_state";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function unb64url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  return value;
}

function signPart(payloadPart) {
  return crypto
    .createHmac("sha256", secret())
    .update(payloadPart)
    .digest("base64url");
}

export function createSessionToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    sub: String(user.id),
    username: String(user.username || ""),
    globalName: user.global_name ? String(user.global_name) : null,
    avatar: user.avatar ? String(user.avatar) : null,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const payloadPart = b64url(JSON.stringify(payload));
  return `${payloadPart}.${signPart(payloadPart)}`;
}

export function verifySessionToken(token) {
  try {
    if (!token || !token.includes(".")) return null;
    const [payloadPart, signature] = token.split(".");
    if (!payloadPart || !signature) return null;

    const expected = signPart(payloadPart);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(unb64url(payloadPart));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now || !payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const raw = req.headers.get("cookie") || "";
  const result = {};
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

export function cookieString(name, value, {
  maxAge,
  secure = true,
  httpOnly = true,
  sameSite = "Lax",
  path = "/",
} = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
  ];
  if (typeof maxAge === "number") parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookieString(name, secure = true) {
  return cookieString(name, "", {
    maxAge: 0,
    secure,
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
  });
}

export function isSecureRequest(req) {
  const url = new URL(req.url);
  return url.protocol === "https:";
}

export function publicSiteUrl(req, context) {
  const configured = (process.env.PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;

  const netlifyUrl = (context?.site?.url || process.env.URL || "").trim().replace(/\/+$/, "");
  if (netlifyUrl) return netlifyUrl;

  return new URL(req.url).origin;
}

export function discordAvatarUrl(payload) {
  if (payload.avatar) {
    return `https://cdn.discordapp.com/avatars/${encodeURIComponent(payload.sub)}/${encodeURIComponent(payload.avatar)}.png?size=128`;
  }
  return "https://cdn.discordapp.com/embed/avatars/0.png";
}
