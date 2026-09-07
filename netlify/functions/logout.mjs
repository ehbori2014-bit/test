import {
  SESSION_COOKIE,
  clearCookieString,
  isSecureRequest,
} from "./_shared/session.mjs";

export default async (req) => {
  const headers = new Headers();
  headers.append("Set-Cookie", clearCookieString(SESSION_COOKIE, isSecureRequest(req)));
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
};

export const config = {
  path: "/auth/logout",
  method: "POST",
};
