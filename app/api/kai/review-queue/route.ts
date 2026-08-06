import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reviewFile = path.join(
  process.cwd(),
  "data",
  "review-queue.json"
);

export async function GET() {
  try {
    const contents = await fs.readFile(reviewFile, "utf8");

    const items = JSON.parse(contents);

    return NextResponse.json({
      success: true,
      items: Array.isArray(items) ? items : [],
    });
  } catch {
    return NextResponse.json({
      success: true,
      items: [],
    });
  }
}