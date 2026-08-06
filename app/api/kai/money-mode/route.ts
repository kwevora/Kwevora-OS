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

  const destinationLink =
    body.destinationLink ||
    "Add your Stan Store, free guide, or product link here.";

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  const prompt = `
You are KAI, the AI COO inside KWEVORA OS.

Create 4 platform-ready content packages for Kent.

Goal:
Help Kent attract attention, sell digital products, promote affiliate offers, and drive people to this link:
${destinationLink}

Create packages for:
- TikTok
- Instagram Reels
- Facebook Reels
- YouTube Shorts

Return ONLY valid JSON.

Use this exact shape:
{
  "packages": [
    {
      "platform": "tiktok",
      "title": "string",
      "hook": "string",
      "script": ["string", "string", "string"],
      "caption": "string",
      "hashtags": ["string", "string"],
      "thumbnailIdea": "string",
      "cta": "string",
      "destinationLink": "string",
      "pinnedComment": "string",
      "reason": "string"
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
      packages: Array.isArray(parsed.packages) ? parsed.packages : [],
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