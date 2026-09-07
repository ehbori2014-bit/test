import crypto from "node:crypto";
import {
  OAUTH_STATE_COOKIE,
  cookieString,
  isSecureRequest,
  publicSiteUrl,
} from "./_shared/session.mjs";

export default async (req, context) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return new Response("DISCORD_CLIENT_ID is not configured.", { status: 500 });
  }

  const siteUrl = publicSiteUrl(req, context);
  const redirectUri = `${siteUrl}/auth/discord/callback`;
  const state = crypto.randomBytes(24).toString("hex");

  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("scope", "identify");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("prompt", "consent");

  const headers = new Headers();
  headers.set("Location", authorize.toString());
  headers.append(
    "Set-Cookie",
    cookieString(OAUTH_STATE_COOKIE, state, {
      maxAge: 600,
      secure: isSecureRequest(req),
      httpOnly: true,
      sameSite: "Lax",
    })
  );
  headers.set("Cache-Control", "no-store");

  return new Response(null, { status: 302, headers });
};

export const config = {
  path: "/auth/discord",
  method: "GET",
};
