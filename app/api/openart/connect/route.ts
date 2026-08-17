import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENART_MCP_URL = "https://mcp.openart.ai/mcp";
const RESOURCE_METADATA_URL =
  "https://mcp.openart.ai/.well-known/oauth-protected-resource/mcp";

type ProtectedResourceMetadata = {
  authorization_servers?: string[];
  scopes_supported?: string[];
};

type AuthorizationServerMetadata = {
  authorization_endpoint?: string;
  registration_endpoint?: string;
  token_endpoint?: string;
  scopes_supported?: string[];
};

type ClientRegistration = {
  client_id?: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
};

function base64Url(value: Uint8Array | ArrayBuffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createPkce() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(64)));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );

  return {
    verifier,
    challenge: base64Url(Buffer.from(digest)),
  };
}

async function loadJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OpenArt discovery failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const redirectUri = `${requestUrl.origin}/api/openart/callback`;

    const resourceMetadata =
      await loadJson<ProtectedResourceMetadata>(RESOURCE_METADATA_URL);

    const authorizationServer =
      resourceMetadata.authorization_servers?.[0];

    if (!authorizationServer) {
      throw new Error("OpenArt did not provide an authorization server.");
    }

    const issuer = authorizationServer.replace(/\/$/, "");
    const authorizationMetadata =
      await loadJson<AuthorizationServerMetadata>(
        `${issuer}/.well-known/oauth-authorization-server`,
      );

    const authorizationEndpoint =
      authorizationMetadata.authorization_endpoint;
    const registrationEndpoint =
      authorizationMetadata.registration_endpoint;
    const tokenEndpoint = authorizationMetadata.token_endpoint;

    if (
      !authorizationEndpoint ||
      !registrationEndpoint ||
      !tokenEndpoint
    ) {
      throw new Error("OpenArt OAuth metadata is incomplete.");
    }

    const registrationResponse = await fetch(registrationEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_name: "KWEVORA OS",
        client_uri: requestUrl.origin,
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
      cache: "no-store",
    });

    if (!registrationResponse.ok) {
      throw new Error(
        `OpenArt client registration failed with status ${registrationResponse.status}.`,
      );
    }

    const registration =
      (await registrationResponse.json()) as ClientRegistration;

    if (!registration.client_id) {
      throw new Error("OpenArt did not return a client ID.");
    }

    const state = crypto.randomUUID();
    const { verifier, challenge } = await createPkce();

    const supportedScopes =
      resourceMetadata.scopes_supported ??
      authorizationMetadata.scopes_supported ??
      [];

    const authorizationUrl = new URL(authorizationEndpoint);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", registration.client_id);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("code_challenge", challenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("resource", OPENART_MCP_URL);

    if (supportedScopes.length > 0) {
      authorizationUrl.searchParams.set(
        "scope",
        supportedScopes.join(" "),
      );
    }

    const response = NextResponse.redirect(authorizationUrl);

    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    };

    response.cookies.set("kwevora_openart_oauth_state", state, cookieOptions);
    response.cookies.set(
      "kwevora_openart_code_verifier",
      verifier,
      cookieOptions,
    );
    response.cookies.set(
      "kwevora_openart_oauth_client",
      Buffer.from(
        JSON.stringify({
          ...registration,
          token_endpoint: tokenEndpoint,
          redirect_uri: redirectUri,
        }),
      ).toString("base64url"),
      cookieOptions,
    );

    return response;
  } catch (error) {
    console.error("OpenArt connection could not begin:", error);

    const settingsUrl = new URL("/settings", request.url);
    settingsUrl.searchParams.set("openart", "connection_failed");

    return NextResponse.redirect(settingsUrl);
  }
}
