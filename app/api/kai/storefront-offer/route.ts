import { NextResponse } from "next/server";
import { storefrontOfferBuilder } from "../../../lib/StorefrontOfferBuilder";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      ...(await storefrontOfferBuilder.summary()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KAI could not load the storefront package.",
      },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (body.action === "update") await storefrontOfferBuilder.update(body);
    else if (body.action === "approve") await storefrontOfferBuilder.approve();
    else if (body.action === "publish")
      await storefrontOfferBuilder.publish({
        destinationLink: body.destinationLink,
        checkoutTested: body.checkoutTested,
        deliveryTested: body.deliveryTested,
      });
    else
      return NextResponse.json(
        { success: false, message: "A valid storefront action is required." },
        { status: 400 },
      );
    return NextResponse.json({
      success: true,
      ...(await storefrontOfferBuilder.summary()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KAI could not update the storefront package.",
      },
      { status: 409 },
    );
  }
}
