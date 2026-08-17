import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    connected: false,
  });

  for (const name of [
    "kwevora_openart_access_token",
    "kwevora_openart_refresh_token",
    "kwevora_openart_connection",
    "kwevora_openart_oauth_state",
    "kwevora_openart_code_verifier",
    "kwevora_openart_oauth_client",
  ]) {
    response.cookies.delete(name);
  }

  return response;
}
