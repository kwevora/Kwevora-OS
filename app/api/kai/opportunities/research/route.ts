import {
  NextRequest,
  NextResponse,
} from "next/server";

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

function cleanString(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function extractOutputText(
  data: any
): string {
  if (
    typeof data?.output_text ===
      "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data?.output)) {
    return "";
  }

  const textParts: string[] = [];

  for (const item of data.output) {
    if (
      !Array.isArray(item?.content)
    ) {
      continue;
    }

    for (
      const content of item.content
    ) {
      if (
        typeof content?.text ===
          "string" &&
        content.text.trim()
      ) {
        textParts.push(
          content.text.trim()
        );
      }
    }
  }

  return textParts
    .join("\n\n")
    .trim();
}

function extractSources(
  data: any
): ResearchSource[] {
  const sources =
    new Map<
      string,
      ResearchSource
    >();

  if (!Array.isArray(data?.output)) {
    return [];
  }

  for (const item of data.output) {
    /*
     * Sources reported directly by
     * a web search call.
     */
    if (
      item?.type ===
        "web_search_call" &&
      Array.isArray(
        item?.action?.sources
      )
    ) {
      for (
        const source of
        item.action.sources
      ) {
        const url =
          typeof source?.url ===
          "string"
            ? source.url.trim()
            : "";

        if (!url) {
          continue;
        }

        sources.set(url, {
          title:
            typeof source?.title ===
              "string" &&
            source.title.trim()
              ? source.title.trim()
              : url,

          url,
        });
      }
    }

    /*
     * Sources can also appear as
     * URL citations attached to
     * generated output text.
     */
    if (
      Array.isArray(item?.content)
    ) {
      for (
        const content of
        item.content
      ) {
        if (
          !Array.isArray(
            content?.annotations
          )
        ) {
          continue;
        }

        for (
          const annotation of
          content.annotations
        ) {
          const url =
            typeof annotation?.url ===
            "string"
              ? annotation.url.trim()
              : typeof annotation
                    ?.url_citation
                    ?.url ===
                  "string"
                ? annotation
                    .url_citation
                    .url.trim()
                : "";

          if (!url) {
            continue;
          }

          const title =
            typeof annotation?.title ===
              "string" &&
            annotation.title.trim()
              ? annotation.title.trim()
              : typeof annotation
                    ?.url_citation
                    ?.title ===
                  "string" &&
                  annotation
                    .url_citation
                    .title.trim()
                ? annotation
                    .url_citation
                    .title.trim()
                : url;

          sources.set(url, {
            title,
            url,
          });
        }
      }
    }
  }

  return Array.from(
    sources.values()
  );
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
    new Date()
      .toISOString()
      .slice(0, 10);

  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model:
            process.env
              .KAI_RESEARCH_MODEL ||
            process.env
              .KAI_TEXT_MODEL ||
            "gpt-5-mini",

          tools: [
            {
              type: "web_search",
              search_context_size:
                "high",
            },
          ],

          tool_choice: "auto",

          instructions: [
            "You are KAI, the operating intelligence inside KWEVORA OS.",

            "Always spell the brand exactly KWEVORA.",

            "You are operating in KWEVORA MONEY MODE.",

            `Today is ${currentDate}.`,

            "",

            "PRIMARY BUSINESS MODEL:",

            "KWEVORA is currently focused on finding EXISTING DIGITAL PRODUCTS created by other people or companies that the user can LEGALLY purchase or license and then resell for the user's own profit.",

            "This is NOT primarily affiliate marketing.",

            "This is NOT primarily creating original digital products from scratch.",

            "",

            "KWEVORA is looking for legitimate products with explicit resale rights such as:",

            "- Master Resell Rights (MRR)",
            "- Private Label Rights (PLR) when the license permits resale",
            "- Resell Rights (RR)",
            "- commercial-use digital products when the license explicitly permits resale",
            "- other legitimate licensing structures that clearly allow the buyer to resell the digital product",

            "",

            "CRITICAL RULE:",

            "Never assume that purchasing or downloading a digital product gives the user the right to resell it.",

            "The actual license controls what KWEVORA may do.",

            "If resale rights cannot be established from reliable evidence, clearly mark the candidate as requiring license verification.",

            "",

            "DEMAND COMES FIRST.",

            "Do not begin by browsing random PLR or MRR catalogs and choosing products simply because they are available.",

            "First investigate what digital-product categories, problems, topics, templates, guides, toolkits, resources, systems, or information products currently show meaningful buyer interest.",

            "Then search for legitimate existing resellable digital products that match that demand.",

            "",

            "Use live web search. Do not answer only from model memory.",

            "Focus on evidence current enough to help make a business decision now.",

            "",

            "DEMAND RESEARCH:",

            "Look for multiple current demand signals when possible.",

            "Possible evidence includes marketplace bestseller or trending pages, search and trend evidence, current creator or consumer interest, reputable ecommerce reporting, marketplace activity, product reviews, category popularity, recurring customer problems, active discussions, and other credible indicators of buying intent.",

            "Do not claim exact sales volume unless a reliable source actually provides it.",

            "Do not call something the hottest product, best seller, or most purchased item unless the evidence supports that claim.",

            "Do not confuse social-media attention with proven buying demand.",

            "",

            "PRODUCT-SOURCE RESEARCH:",

            "After identifying demand, search for specific existing digital products that appear to match it and may legally permit resale.",

            "Identify the actual seller, marketplace, licensing provider, or product source whenever possible.",

            "Prefer sources where the licensing terms can be inspected.",

            "",

            "LICENSE RESEARCH:",

            "For each candidate investigate the exact resale or commercial license.",

            "Distinguish MRR, PLR, RR, personal-use rights, commercial-use rights, and affiliate rights.",

            "Do not treat these terms as interchangeable.",

            "Look for whether the license permits resale to end customers.",

            "Look for whether rebranding or modification is permitted.",

            "Look for whether the user may pass resale rights to the next buyer.",

            "Look for minimum-price restrictions, marketplace restrictions, advertising restrictions, bundling restrictions, giveaway restrictions, membership-site restrictions, and other important license conditions.",

            "If the license is vague, missing, contradictory, or unavailable, say so.",

            "",

            "ECONOMICS:",

            "When verifiable, investigate acquisition or license cost, suggested or required resale price, likely price range, recurring fees, platform fees, and realistic gross-margin potential.",

            "Never invent prices or profit margins.",

            "",

            "QUALITY:",

            "A product being legally resellable does not automatically make it a good opportunity.",

            "Look for evidence about product quality, usefulness, freshness, professionalism, completeness, customer feedback, seller reputation, and whether the information appears outdated or overly generic.",

            "",

            "MARKETING:",

            "Evaluate whether the product can realistically be marketed with original faceless short-form content.",

            "Consider demonstrations, previews, tutorials, problem-solution videos, before-and-after examples, text-led videos, screen recordings, original voiceover, and other legitimate promotional formats.",

            "Do not assume KWEVORA may copy copyrighted promotional videos or creative assets.",

            "",

            "COMPETITION:",

            "Investigate whether the market appears saturated with identical copies of the same resellable product.",

            "Look for ways the product could be positioned or packaged without making misleading claims.",

            "",

            "SAFETY AND LEGITIMACY:",

            "Reject pirated, stolen, counterfeit, deceptive, illegal, unsafe, or clearly unauthorized products.",

            "Avoid products built around misleading income guarantees or unsupported financial claims.",

            "Do not recommend something merely because it promises easy money.",

            "",

            "AFFILIATE PROGRAMS:",

            "Affiliate marketing is currently secondary.",

            "Do not prioritize affiliate offers unless the user's request specifically asks for them.",

            "",

            "RESEARCH STANDARD:",

            "Do not recommend an opportunity based solely on one weak source.",

            "Gather enough evidence for KWEVORA's Opportunity Brain to compare several possibilities.",

            "For every candidate clearly separate what has been supported by evidence from what still requires verification.",

            "Return a research briefing, not the final business decision.",

            "Use plain language.",
          ].join("\n"),

          input: [
            {
              role: "user",

              content: [
                {
                  type:
                    "input_text",

                  text: [
                    "KWEVORA MONEY MODE — RESELLABLE DIGITAL PRODUCT RESEARCH",

                    "",

                    `Niche: ${
                      niche ||
                      "Open. Search broadly across legitimate digital-product categories."
                    }`,

                    `Audience: ${
                      audience ||
                      "Open. Identify promising buyer groups from current demand."
                    }`,

                    `Goal: ${
                      goal ||
                      "Find strong current demand and match it with an existing quality digital product that can legally be resold for profit."
                    }`,

                    `Additional notes: ${
                      notes ||
                      "Keep startup cost low and favor opportunities that can be marketed with faceless content."
                    }`,

                    "",

                    "PHASE 1 — FIND CURRENT DEMAND",

                    "Research what people currently appear interested in buying in the digital-product market.",

                    "Look across multiple categories instead of assuming a niche in advance.",

                    "Identify several promising problems, needs, desires, or product categories.",

                    "",

                    "PHASE 2 — MATCH DEMAND TO EXISTING PRODUCTS",

                    "For the strongest demand areas, search for specific existing digital products that appear to offer legitimate resale rights.",

                    "",

                    "FOR EACH CANDIDATE INVESTIGATE:",

                    "- exact product name",
                    "- seller/provider/marketplace",
                    "- product URL or legitimate source when available",
                    "- what the product contains",
                    "- intended customer",
                    "- customer problem or desire",
                    "- current demand evidence",
                    "- why buyers appear interested",
                    "- evidence from more than one source when possible",
                    "- product or license acquisition cost when verifiable",
                    "- likely or permitted resale price when verifiable",
                    "- estimated margin only when supported by actual pricing evidence",
                    "- exact license type",
                    "- whether resale to end customers appears permitted",
                    "- whether rebranding appears permitted",
                    "- whether modification appears permitted",
                    "- whether resale rights can be passed to the next buyer",
                    "- minimum-price rules",
                    "- marketplace restrictions",
                    "- advertising or promotional restrictions",
                    "- other important license conditions",
                    "- product quality signals",
                    "- seller/source reputation signals",
                    "- freshness or outdated-content concerns",
                    "- competition or saturation concerns",
                    "- faceless marketing potential",
                    "- legitimate marketing angles",
                    "- major risks",
                    "- exactly what still needs verification",

                    "",

                    "IMPORTANT:",

                    "A product must not be treated as legally resellable merely because a page uses the words PLR, MRR, commercial use, or resale.",

                    "The verification stage will later inspect the exact license before KWEVORA authorizes selling anything.",

                    "",

                    "Do not pick the final winner.",

                    "Produce factual live research for KWEVORA's Opportunity Brain to evaluate.",
                  ].join("\n"),
                },
              ],
            },
          ],
        }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "KAI could not complete live resellable digital product research."
    );
  }

  const research =
    extractOutputText(data);

  const sources =
    extractSources(data);

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

    mode:
      "KWEVORA_MONEY_MODE",

    capability:
      "resellable_digital_product_research_v1",

    status: "ready",

    businessModel:
      "existing_resellable_digital_products",

    priorities: [
      "Current buyer demand",
      "Existing digital product",
      "Explicit resale rights",
      "Product quality",
      "Low startup cost",
      "Healthy margin potential",
      "Faceless marketing potential",
    ],

    hardRule:
      "No verified resale rights means KWEVORA cannot authorize the product for sale.",

    mission:
      "Find current digital-product demand and match it with legitimate existing products that may be legally resold for profit.",
  });
}

export async function POST(
  request: NextRequest
) {
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
      cleanString(
        body.audience
      );

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

      mode:
        "KWEVORA_MONEY_MODE",

      capability:
        "resellable_digital_product_research_v1",

      businessModel:
        "existing_resellable_digital_products",

      researchedAt:
        new Date().toISOString(),

      research:
        result.research,

      sources:
        result.sources,

      sourceCount:
        result.sources.length,

      hardRule:
        "Research may identify a candidate, but KWEVORA must independently verify its exact resale license before authorizing a sale.",

      nextAction:
        "Send this demand, product, pricing, quality, and license evidence to KWEVORA's Opportunity Brain for evaluation.",
    });
  } catch (error) {
    console.error(
      "KWEVORA resellable digital product research failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        mode:
          "KWEVORA_MONEY_MODE",

        message:
          error instanceof Error
            ? error.message
            : "KAI could not complete resellable digital product research.",
      },
      {
        status: 500,
      }
    );
  }
}