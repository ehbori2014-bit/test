import {
  SESSION_COOKIE,
  OAUTH_STATE_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  parseCookies,
  cookieString,
  clearCookieString,
  isSecureRequest,
  publicSiteUrl,
} from "./_shared/session.mjs";

function safeError(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "unknown";
}

function redirectWithError(siteUrl, error, secure) {
  const headers = new Headers();
  headers.set("Location", `${siteUrl}/?auth_error=${encodeURIComponent(safeError(error))}`);
  headers.append("Set-Cookie", clearCookieString(OAUTH_STATE_COOKIE, secure));
  headers.set("Cache-Control", "no-store");
  return new Response(null, { status: 302, headers });
}

export default async (req, context) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const siteUrl = publicSiteUrl(req, context);
  const redirectUri = `${siteUrl}/auth/discord/callback`;
  const secure = isSecureRequest(req);

  if (!clientId || !clientSecret || !process.env.SESSION_SECRET) {
    return redirectWithError(siteUrl, "server_config", secure);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return redirectWithError(siteUrl, oauthError, secure);
  }

  const cookies = parseCookies(req);
  const expectedState = cookies[OAUTH_STATE_COOKIE];

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(siteUrl, "invalid_state", secure);
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!tokenResponse.ok) {
      console.error("Discord token exchange failed:", tokenResponse.status, await tokenResponse.text());
      return redirectWithError(siteUrl, "token_exchange", secure);
    }

    const token = await tokenResponse.json();

    const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error("Discord user fetch failed:", userResponse.status, await userResponse.text());
      return redirectWithError(siteUrl, "user_fetch", secure);
    }

    const user = await userResponse.json();
    const session = createSessionToken(user);

    const headers = new Headers();
    headers.set("Location", `${siteUrl}/?auth=discord`);
    headers.append(
      "Set-Cookie",
      cookieString(SESSION_COOKIE, session, {
        maxAge: SESSION_TTL_SECONDS,
        secure,
        httpOnly: true,
        sameSite: "Lax",
      })
    );
    headers.append("Set-Cookie", clearCookieString(OAUTH_STATE_COOKIE, secure));
    headers.set("Cache-Control", "no-store");

    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error("Discord callback error:", error);
    return redirectWithError(siteUrl, "callback_failed", secure);
  }
};

export const config = {
  path: "/auth/discord/callback",
  method: "GET",
};
