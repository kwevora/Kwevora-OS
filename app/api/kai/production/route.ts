import { NextResponse } from "next/server";

function extractText(data: any): string {
  if (typeof data.output_text === "string") return data.output_text;

  const output = data.output ?? [];

  for (const item of output) {
    const content = item.content ?? [];

    for (const part of content) {
      if (typeof part.text === "string") return part.text;
    }
  }

  return "";
}

function extractJson(text: string) {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found.");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

export async function POST(request: Request) {
  const body = await request.json();

  const memory = body.memory ?? [];
  const runtime = body.runtime ?? {};
  const offerName = body.offerName || "The Escape Plan";
  const destinationLink = body.destinationLink || "Your Stan Store / link in bio";

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  const prompt = `
You are KAI, the AI Chief Operating Officer for KWEVORA OS.

Money Mode mission:
Create content that helps Kent get attention, drive clicks, and sell digital products.

Offer name:
${offerName}

Destination link / link strategy:
${destinationLink}

Memory:
${JSON.stringify(memory, null, 2)}

Runtime:
${JSON.stringify(runtime, null, 2)}

Create exactly 3 publish-ready short-form content packages.
Each package must work for someone selling digital products or affiliate offers.
Every package must include platform versions for:
- tiktok
- instagram_reels
- youtube_shorts
- facebook_reels

Return ONLY valid JSON in this exact shape:
{
  "contentPackages": [
    {
      "title": "string",
      "coreIdea": "string",
      "offerName": "string",
      "destinationLink": "string",
      "thumbnailIdeas": ["string"],
      "productionNotes": ["string"],
      "platformVersions": [
        {
          "platform": "tiktok",
          "hook": "string",
          "script": "string",
          "caption": "string",
          "hashtags": ["string"],
          "cta": "string",
          "pinnedComment": "string",
          "destinationLink": "string"
        }
      ]
    }
  ]
}
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  const text = extractText(data);

  try {
    const parsed = extractJson(text);

    return NextResponse.json({
      contentPackages: Array.isArray(parsed.contentPackages)
        ? parsed.contentPackages
        : [],
    });
  } catch {
    return NextResponse.json(
      {
        error: "Money Mode AI responded, but JSON parsing failed.",
        raw: text,
      },
      { status: 500 }
    );
  }
}
