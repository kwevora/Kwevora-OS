import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResearchRequest = {
  niche?: string;
  audience?: string;
  goal?: string;
  notes?: string;
};

type ResearchSource = {
  title: string;
  url: string;
};

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function extractOutputText(data: any): string {
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data?.output)) {
    return "";
  }

  const textParts: string[] = [];

  for (const item of data.output) {
    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const content of item.content) {
      if (
        typeof content?.text === "string" &&
        content.text.trim()
      ) {
        textParts.push(content.text.trim());
      }
    }
  }

  return textParts.join("\n\n").trim();
}

function extractSources(data: any): ResearchSource[] {
  const sources = new Map<string, ResearchSource>();

  if (!Array.isArray(data?.output)) {
    return [];
  }

  for (const item of data.output) {
    /*
     * Sources reported directly by a web search call.
     */
    if (
      item?.type === "web_search_call" &&
      Array.isArray(item?.action?.sources)
    ) {
      for (const source of item.action.sources) {
        const url =
          typeof source?.url === "string"
            ? source.url.trim()
            : "";

        if (!url) {
          continue;
        }

        sources.set(url, {
          title:
            typeof source?.title === "string" &&
            source.title.trim()
              ? source.title.trim()
              : url,
          url,
        });
      }
    }

    /*
     * Sources can also appear as URL citations
     * attached to generated output text.
     */
    if (Array.isArray(item?.content)) {
      for (const content of item.content) {
        if (!Array.isArray(content?.annotations)) {
          continue;
        }

        for (const annotation of content.annotations) {
          const url =
            typeof annotation?.url === "string"
              ? annotation.url.trim()
              : typeof annotation?.url_citation?.url === "string"
                ? annotation.url_citation.url.trim()
                : "";

          if (!url) {
            continue;
          }

          const title =
            typeof annotation?.title === "string" &&
            annotation.title.trim()
              ? annotation.title.trim()
              : typeof annotation?.url_citation?.title === "string" &&
                  annotation.url_citation.title.trim()
                ? annotation.url_citation.title.trim()
                : url;

          sources.set(url, {
            title,
            url,
          });
        }
      }
    }
  }

  return Array.from(sources.values());
}

async function runLiveResearch({
  apiKey,
  niche,
  audience,
  goal,
  notes,
}: {
  apiKey: string;
  niche: string;
  audience: string;
  goal: string;
  notes: string;
}) {
  const currentDate =
    new Date().toISOString().slice(0, 10);

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model:
          process.env.KAI_RESEARCH_MODEL ||
          process.env.KAI_TEXT_MODEL ||
          "gpt-5-mini",

        tools: [
          {
            type: "web_search",
            search_context_size: "high",
          },
        ],

        tool_choice: "auto",

        instructions: [
          "You are KAI, the operating intelligence inside KWEVORA OS.",
          "Always spell the brand exactly KWEVORA.",
          "You are operating in KWEVORA MONEY MODE.",
          "Your job is to research current real-world digital and affiliate marketing opportunities.",
          "Use web search. Do not answer only from model memory.",
          `Today is ${currentDate}.`,
          "Focus on evidence that is current enough to help make a business decision now.",
          "Research products, brands, offers, categories, consumer problems, affiliate opportunities, creator trends, marketplace signals, and buying interest.",
          "Look for opportunities a new marketer could realistically test without large upfront inventory or ad spend.",
          "Do not assume viral equals profitable.",
          "Look for evidence of actual demand or strong buying intent.",
          "Distinguish affiliate marketing from authorized resale.",
          "Never claim the user may resell a branded product unless you find evidence of legitimate resale rights.",
          "Never invent commission percentages, affiliate programs, prices, sales numbers, search volume, or supplier relationships.",
          "When affiliate information cannot be verified, say it needs verification.",
          "Prefer official brand or affiliate-program sources when verifying program details.",
          "Marketplace bestseller pages, trend reports, reputable commerce publications, search/trend evidence, and current product coverage can be used as demand evidence.",
          "Avoid illegal, deceptive, counterfeit, unsafe, or restricted products.",
          "Do not recommend opportunities based solely on one weak source.",
          "Gather enough evidence for the Opportunity Brain to compare several possibilities.",
          "Return a research briefing, not a final business decision.",
          "For every candidate, clearly state what evidence was found and what still needs verification.",
          "Use plain language.",
        ].join(" "),

        input: [
          {
            role: "user",

            content: [
              {
                type: "input_text",

                text: [
                  "KWEVORA LIVE MONEY MODE RESEARCH",
                  "",
                  `Niche: ${
                    niche ||
                    "Open. Search broadly for strong current opportunities."
                  }`,
                  `Audience: ${
                    audience ||
                    "Open. Identify promising buyer groups during research."
                  }`,
                  `Goal: ${
                    goal ||
                    "Find practical digital or affiliate marketing opportunities that can be tested quickly and have realistic income potential."
                  }`,
                  `Additional notes: ${
                    notes || "None."
                  }`,
                  "",
                  "Research several current opportunities.",
                  "For each candidate investigate:",
                  "- product or offer",
                  "- brand/company when applicable",
                  "- what appears to be driving demand",
                  "- evidence that people are interested or buying",
                  "- likely customer",
                  "- customer problem or desire",
                  "- typical price information when verifiable",
                  "- legitimate affiliate program or monetization path when verifiable",
                  "- where the offer/product can legitimately be found",
                  "- marketing/content potential",
                  "- competitive concerns",
                  "- risks or restrictions",
                  "- what still needs verification",
                  "",
                  "Do not pick the final winner. Produce factual research for KWEVORA's Opportunity Brain to evaluate.",
                ].join("\n"),
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "KAI could not complete live market research."
    );
  }

  const research = extractOutputText(data);
  const sources = extractSources(data);

  if (!research) {
    throw new Error(
      "KAI completed the research request but returned no usable research."
    );
  }

  return {
    research,
    sources,
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    mode: "KWEVORA_MONEY_MODE",
    capability: "live_opportunity_research",
    status: "ready",
    mission:
      "Research current market opportunities before KAI makes a money decision.",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body =
      (await request
        .json()
        .catch(() => ({}))) as ResearchRequest;

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "OPENAI_API_KEY is missing from the KWEVORA environment.",
        },
        {
          status: 500,
        }
      );
    }

    const niche =
      cleanString(body.niche);

    const audience =
      cleanString(body.audience);

    const goal =
      cleanString(body.goal);

    const notes =
      cleanString(body.notes);

    const result =
      await runLiveResearch({
        apiKey,
        niche,
        audience,
        goal,
        notes,
      });

    return NextResponse.json({
      success: true,

      mode: "KWEVORA_MONEY_MODE",

      researchedAt:
        new Date().toISOString(),

      research:
        result.research,

      sources:
        result.sources,

      sourceCount:
        result.sources.length,

      nextAction:
        "Send this evidence to the KWEVORA Opportunity Brain for scoring and recommendation.",
    });
  } catch (error) {
    console.error(
      "KWEVORA live opportunity research failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "KAI could not complete live opportunity research.",
      },
      {
        status: 500,
      }
    );
  }
}