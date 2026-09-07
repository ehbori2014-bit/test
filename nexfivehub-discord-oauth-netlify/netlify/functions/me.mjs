import {
  SESSION_COOKIE,
  verifySessionToken,
  parseCookies,
  discordAvatarUrl,
} from "./_shared/session.mjs";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export default async (req) => {
  const cookies = parseCookies(req);
  const payload = verifySessionToken(cookies[SESSION_COOKIE]);

  if (!payload) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      user: {
        id: payload.sub,
        username: payload.username,
        globalName: payload.globalName,
        avatarUrl: discordAvatarUrl(payload),
      },
    }),
    { status: 200, headers: jsonHeaders }
  );
};

export const config = {
  path: "/api/me",
  method: "GET",
};
