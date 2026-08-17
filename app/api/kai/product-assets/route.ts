import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ALLOWED_TYPES = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"],
]);
const MAX_FILE_BYTES = 150 * 1024 * 1024;
const MAX_FILES = 8;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "Select product screenshots or a screen recording." }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ success: false, error: `Choose no more than ${MAX_FILES} product files.` }, { status: 400 });
    }

    const folder = randomUUID();
    const outputDirectory = path.join(process.cwd(), "public", "uploads", "product-proof", folder);
    await mkdir(outputDirectory, { recursive: true });
    const urls: string[] = [];

    for (const file of files) {
      const extension = ALLOWED_TYPES.get(file.type);
      if (!extension) throw new Error(`${file.name} is not a supported image or video file.`);
      if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 150 MB.`);
      const fileName = `${randomUUID()}${extension}`;
      await writeFile(path.join(outputDirectory, fileName), Buffer.from(await file.arrayBuffer()));
      urls.push(`/uploads/product-proof/${folder}/${fileName}`);
    }

    return NextResponse.json({ success: true, urls });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Product upload failed." },
      { status: 500 },
    );
  }
}
