import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type StoredOAuthClient = {
  client_id?: string;
  client_secret?: string;
  token_endpoint?: string;
  redirect_uri?: string;
};

type OpenArtTokens = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/settings", request.url);

  try {
    const callbackUrl = new URL(request.url);
    const code = callbackUrl.searchParams.get("code");
    const returnedState = callbackUrl.searchParams.get("state");
    const error = callbackUrl.searchParams.get("error");

    const expectedState = request.cookies.get(
      "kwevora_openart_oauth_state",
    )?.value;
    const verifier = request.cookies.get(
      "kwevora_openart_code_verifier",
    )?.value;
    const encodedClient = request.cookies.get(
      "kwevora_openart_oauth_client",
    )?.value;

    if (error) {
      throw new Error(`OpenArt authorization returned: ${error}`);
    }

    if (
      !code ||
      !returnedState ||
      !expectedState ||
      returnedState !== expectedState ||
      !verifier ||
      !encodedClient
    ) {
      throw new Error("OpenArt authorization could not be verified.");
    }

    const client = JSON.parse(
      Buffer.from(encodedClient, "base64url").toString("utf8"),
    ) as StoredOAuthClient;

    if (
      !client.client_id ||
      !client.token_endpoint ||
      !client.redirect_uri
    ) {
      throw new Error("OpenArt client information is incomplete.");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: client.client_id,
      redirect_uri: client.redirect_uri,
      code_verifier: verifier,
      resource: "https://mcp.openart.ai/mcp",
    });

    if (client.client_secret) {
      body.set("client_secret", client.client_secret);
    }

    const tokenResponse = await fetch(client.token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      throw new Error(
        `OpenArt token exchange failed with status ${tokenResponse.status}.`,
      );
    }

    const tokens = (await tokenResponse.json()) as OpenArtTokens;

    if (!tokens.access_token) {
      throw new Error("OpenArt did not return an access token.");
    }

    settingsUrl.searchParams.set("openart", "connected");
    const response = NextResponse.redirect(settingsUrl);

    const secure = process.env.NODE_ENV === "production";

    response.cookies.set(
      "kwevora_openart_access_token",
      tokens.access_token,
      {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: Math.max(60, tokens.expires_in ?? 60 * 60),
      },
    );

    if (tokens.refresh_token) {
      response.cookies.set(
        "kwevora_openart_refresh_token",
        tokens.refresh_token,
        {
          httpOnly: true,
          sameSite: "lax",
          secure,
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        },
      );
    }

    response.cookies.set(
      "kwevora_openart_connection",
      Buffer.from(
        JSON.stringify({
          connectedAt: new Date().toISOString(),
          scope: tokens.scope ?? "",
          tokenType: tokens.token_type ?? "Bearer",
          client,
        }),
      ).toString("base64url"),
      {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );

    response.cookies.delete("kwevora_openart_oauth_state");
    response.cookies.delete("kwevora_openart_code_verifier");
    response.cookies.delete("kwevora_openart_oauth_client");

    return response;
  } catch (error) {
    console.error("OpenArt authorization failed:", error);
    settingsUrl.searchParams.set("openart", "authorization_failed");
    return NextResponse.redirect(settingsUrl);
  }
}
