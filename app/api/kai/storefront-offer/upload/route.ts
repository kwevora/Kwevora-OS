import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { storefrontOfferBuilder } from "../../../../lib/StorefrontOfferBuilder";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ALLOWED = new Set([".pdf", ".zip", ".docx", ".xlsx", ".pptx"]);
export async function POST(request: Request) {
  try {
    const form = await request.formData(),
      file = form.get("file");
    if (!(file instanceof File) || file.size === 0)
      return NextResponse.json(
        { success: false, message: "Choose a customer delivery file." },
        { status: 400 },
      );
    if (file.size > 100 * 1024 * 1024)
      return NextResponse.json(
        {
          success: false,
          message: "The delivery file must be 100 MB or smaller.",
        },
        { status: 413 },
      );
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED.has(ext))
      return NextResponse.json(
        {
          success: false,
          message: "Use a PDF, ZIP, DOCX, XLSX, or PPTX delivery file.",
        },
        { status: 415 },
      );
    const safeBase =
        path
          .basename(file.name, ext)
          .replace(/[^a-zA-Z0-9_-]+/g, "-")
          .slice(0, 80) || "digital-product",
      stored = `${safeBase}-${randomUUID()}${ext}`,
      relative = path.join("uploads", "storefront-products", stored),
      folder = path.join(process.cwd(), "uploads", "storefront-products");
    await mkdir(folder, { recursive: true });
    await writeFile(
      path.join(folder, stored),
      Buffer.from(await file.arrayBuffer()),
    );
    await storefrontOfferBuilder.attachDelivery({
      fileName: file.name,
      storedPath: relative,
      sizeBytes: file.size,
    });
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
            : "KAI could not store the customer delivery file.",
      },
      { status: 500 },
    );
  }
}
