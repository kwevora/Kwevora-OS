import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type StoredConnection = {
  connectedAt?: string;
  scope?: string;
};

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(
    "kwevora_openart_access_token",
  )?.value;
  const refreshToken = request.cookies.get(
    "kwevora_openart_refresh_token",
  )?.value;
  const encodedConnection = request.cookies.get(
    "kwevora_openart_connection",
  )?.value;

  let connection: StoredConnection = {};

  if (encodedConnection) {
    try {
      connection = JSON.parse(
        Buffer.from(encodedConnection, "base64url").toString("utf8"),
      ) as StoredConnection;
    } catch {
      connection = {};
    }
  }

  return NextResponse.json({
    success: true,
    connected: Boolean((accessToken || refreshToken) && encodedConnection),
    authenticated: Boolean(accessToken),
    refreshAvailable: Boolean(refreshToken),
    connectedAt: connection.connectedAt ?? "",
    scope: connection.scope ?? "",
  });
}
