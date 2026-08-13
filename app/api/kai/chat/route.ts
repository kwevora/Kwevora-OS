import { NextResponse } from "next/server";

type ConversationMessage = {
  role?: "user" | "kai";
  text?: string;
};

type ChatRequest = {
  message?: string;
  intent?: "question" | "directive" | "brainstorm" | "conversation";
  conversation?: ConversationMessage[];
  directives?: string[];
};

type ResearchSource = {
  title: string;
  url: string;
};

type ResearchResult = {
  performed: boolean;
  summary: string;
  sources: ResearchSource[];
};

type KaiChatResult = {
  reply: string;
  newDirectives: string[];
  research: ResearchResult;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanText(item))
    .filter(Boolean)
    .slice(0, 8);
}

function extractOutputText(data: any): string {
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data?.output)) return "";

  for (const item of data.output) {
    if (!Array.isArray(item?.content)) continue;

    for (const part of item.content) {
      if (
        part?.type === "output_text" &&
        typeof part?.text === "string" &&
        part.text.trim()
      ) {
        return part.text.trim();
      }

      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text.trim();
      }
    }
  }

  return "";
}

function buildConversationContext(
  messages: ConversationMessage[],
): string {
  return messages
    .slice(-20)
    .map((message) => {
      const role = message.role === "kai" ? "KAI" : "OWNER";
      return `${role}: ${cleanText(message.text)}`;
    })
    .filter((line) => !line.endsWith(":"))
    .join("\n");
}

function normalizeDirective(directive: string): string {
  const cleaned = directive
    .trim()
    .replace(/^kai[:,]?\s*/i, "")
    .replace(/\s+/g, " ");

  if (!cleaned) return "";

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function removeDuplicateDirectives(
  proposed: string[],
  existing: string[],
): string[] {
  const existingNormalized = new Set(
    existing.map((item) => item.trim().toLowerCase()),
  );

  const seen = new Set<string>();

  return proposed
    .map(normalizeDirective)
    .filter(Boolean)
    .filter((directive) => {
      const normalized = directive.toLowerCase();

      if (
        existingNormalized.has(normalized) ||
        seen.has(normalized)
      ) {
        return false;
      }

      seen.add(normalized);
      return true;
    })
    .slice(0, 5);
}

function shouldUseResearch(message: string): boolean {
  const normalized = message.toLowerCase();

  const researchSignals = [
    "research",
    "search",
    "find me",
    "find the",
    "find a",
    "look up",
    "where can",
    "where do",
    "website",
    "product to sell",
    "product to resell",
    "digital product",
    "resell rights",
    "resale rights",
    "master resell",
    "master resale",
    "mrr",
    "private label rights",
    "plr",
    "commercial rights",
    "license",
    "licensing",
    "current price",
    "how much does",
    "best product",
    "best opportunity",
    "best option",
    "what should we sell",
    "what can we sell",
    "what can i sell",
    "what should i sell",
    "competitor",
    "competition",
    "market demand",
    "trending",
    "trend",
  ];

  return researchSignals.some((signal) =>
    normalized.includes(signal),
  );
}

function cleanResearch(value: unknown): ResearchResult {
  if (!value || typeof value !== "object") {
    return {
      performed: false,
      summary: "",
      sources: [],
    };
  }

  const research = value as {
    performed?: unknown;
    summary?: unknown;
    sources?: unknown;
  };

  const sources = Array.isArray(research.sources)
    ? research.sources
        .map((source) => {
          if (!source || typeof source !== "object") return null;

          const candidate = source as {
            title?: unknown;
            url?: unknown;
          };

          const title = cleanText(candidate.title);
          const url = cleanText(candidate.url);

          if (!title || !url) return null;

          return {
            title,
            url,
          };
        })
        .filter(
          (source): source is ResearchSource => source !== null,
        )
        .slice(0, 8)
    : [];

  return {
    performed: research.performed === true,
    summary: cleanText(research.summary),
    sources,
  };
}

export async function POST(request: Request) {
  try {
    const body = (
      await request.json().catch(() => ({}))
    ) as ChatRequest;

    const message = cleanText(body.message);

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "KAI needs a message to respond to.",
        },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "OPENAI_API_KEY is missing from the KWEVORA environment.",
        },
        { status: 500 },
      );
    }

    const conversation = Array.isArray(body.conversation)
      ? body.conversation
      : [];

    const directives = Array.isArray(body.directives)
      ? body.directives
          .map(cleanText)
          .filter(Boolean)
          .slice(0, 20)
      : [];

    const conversationContext =
      buildConversationContext(conversation);

    const activeDirectiveContext =
      directives.length > 0
        ? directives
            .map(
              (directive, index) =>
                `${index + 1}. ${directive}`,
            )
            .join("\n")
        : "None currently saved.";

    const currentIntent =
      body.intent === "directive"
        ? "directive"
        : body.intent === "brainstorm"
          ? "brainstorm"
          : body.intent === "conversation"
            ? "conversation"
            : "question";

    const researchRequested =
      shouldUseResearch(message);

    const prompt = [
      "OWNER COMMAND HIERARCHY",
      "1. The owner's newest direct instruction has the highest authority.",
      "2. Active business directives are binding.",
      "3. Earlier owner decisions stay active unless replaced.",
      "4. KAI recommendations come after owner decisions.",
      "",
      "CURRENT OWNER MESSAGE",
      message,
      "",
      `REQUEST TYPE: ${currentIntent}`,
      `LIVE RESEARCH ENABLED FOR THIS REQUEST: ${
        researchRequested ? "YES" : "NO"
      }`,
      "",
      "ACTIVE BUSINESS DIRECTIVES",
      activeDirectiveContext,
      "",
      "RECENT CONVERSATION",
      conversationContext ||
        "No earlier conversation is available.",
      "",
      "OWNER EXPERIENCE",
      "The owner should not need to know digital marketing before using KWEVORA.",
      "KAI should do the research, comparison, narrowing, planning, and preparation whenever the system has the capability.",
      "Do not turn the owner's lack of expertise into homework.",
      "",
      "RESEARCH RULES",
      researchRequested
        ? "This request requires current outside information. Use web search before making factual product, seller, pricing, licensing, market, or availability recommendations."
        : "This request does not automatically require web research. Answer from supplied context unless current outside information is genuinely necessary.",
      "When researching products, prioritize real primary sources such as the seller, creator, marketplace listing, official licensing page, or terms page.",
      "Do not claim resale, commercial, PLR, or MRR rights unless evidence supports the claim.",
      "Distinguish between MRR, PLR, commercial-use rights, affiliate rights, and ordinary personal-use purchases.",
      "A product being downloadable does NOT mean the owner has the legal right to resell it.",
      "Do not invent prices, products, sellers, licenses, demand, margins, or availability.",
      "If an important license term cannot be verified, say that it is unverified.",
      "If evidence conflicts, explain the conflict rather than hiding it.",
      "",
      "PRODUCT RESEARCH STANDARD",
      "When the owner asks KAI to find a product or business opportunity, KAI should research before recommending.",
      "Compare real candidates internally and bring the owner the strongest recommendation rather than dumping a giant list.",
      "The recommendation should include, when verified and relevant:",
      "- actual product name",
      "- seller or source website",
      "- acquisition price",
      "- licensing or resale rights",
      "- what the license allows",
      "- important restrictions",
      "- suggested resale approach",
      "- why this candidate is stronger than the alternatives",
      "- the source evidence needed for the owner to inspect or obtain it",
      "",
      "OPERATOR MODE",
      "KAI is an operator, not a course instructor.",
      "Give the owner the result of the work, not a lesson on how the owner could do the work themselves.",
      "Do not make the owner research products that KAI can research.",
      "Do not make the owner compare many choices when KAI can recommend the strongest one.",
      "",
      "ONE-MOVE RULE",
      "After doing the necessary work, bring the owner the next meaningful decision.",
      "Do not dump the entire future workflow when later steps depend on the current decision.",
      "",
      "DIRECTIVE EXTRACTION",
      "A message can be both a question and a durable directive.",
      "Extract lasting business rules, preferences, restrictions, priorities, or owner decisions.",
      "Do not save ordinary questions or temporary conversation as directives.",
      "Do not duplicate existing active directives.",
      "",
      "TRUTHFUL EXECUTION",
      "Research is not execution.",
      "Do not claim to have purchased, downloaded, uploaded, published, created an external account, accepted legal terms, spent money, or completed an external action merely because you researched it.",
      "When an external action requires owner approval, payment, credentials, legal acceptance, or a capability KWEVORA does not yet have, clearly identify that boundary.",
    ].join("\n");

    const requestBody: Record<string, unknown> = {
      model: "gpt-5",

      instructions: [
        "You are KAI, the AI Chief Operating Officer inside KWEVORA OS.",

        "Your purpose is to reduce how much the owner has to know and do.",

        "The owner gives goals, preferences, approvals, and unavoidable human inputs. KAI does the thinking, research, comparison, narrowing, and preparation whenever tools allow.",

        "The owner is the final authority.",

        "Authority order: newest owner instruction, active directives, earlier unchanged owner decisions, owner goals, then KAI recommendations.",

        "If the owner rejects a direction, stop steering back toward it.",

        "Act like an operator, not a teacher.",

        "When live research is enabled, actually use web search before making current factual recommendations.",

        "Never describe hypothetical research as completed research.",

        "Never invent a product, price, seller, website, license, resale right, commercial right, market fact, or source.",

        "For resale opportunities, licensing evidence is critical. A digital product cannot be recommended for resale merely because it can be purchased or downloaded.",

        "Prefer primary sources when verifying products and license terms.",

        "If KAI finds several possibilities, compare them and recommend the strongest one rather than making the owner perform the comparison.",

        "The ideal owner experience is: KAI researches, KAI recommends, KAI shows evidence, owner approves, KAI continues.",

        "Do not overwhelm the owner with a long educational checklist.",

        "Give the next meaningful decision after completing the work that can be completed now.",

        "A message may contain both a question and a durable directive.",

        "Extract only durable operating preferences or decisions that should guide future work.",

        "Never claim to have purchased, downloaded, uploaded, published, contacted someone, created an account, accepted terms, or spent money unless an actual connected capability completed that action.",

        "Use plainspoken, confident language.",

        "Do not say 'I think'.",

        "Keep responses readable inside the KWEVORA interface.",
      ].join(" "),

      input: prompt,

      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "kwevora_kai_chat_result",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              reply: {
                type: "string",
              },
              newDirectives: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              research: {
                type: "object",
                additionalProperties: false,
                properties: {
                  performed: {
                    type: "boolean",
                  },
                  summary: {
                    type: "string",
                  },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        title: {
                          type: "string",
                        },
                        url: {
                          type: "string",
                        },
                      },
                      required: [
                        "title",
                        "url",
                      ],
                    },
                  },
                },
                required: [
                  "performed",
                  "summary",
                  "sources",
                ],
              },
            },
            required: [
              "reply",
              "newDirectives",
              "research",
            ],
          },
        },
      },
    };

    if (researchRequested) {
      requestBody.tools = [
        {
          type: "web_search",
        },
      ];

      requestBody.tool_choice = "auto";
    }

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    const data = await openAIResponse
      .json()
      .catch(() => ({}));

    if (!openAIResponse.ok) {
      const openAIMessage =
        typeof (data as any)?.error?.message === "string"
          ? (data as any).error.message
          : "KAI could not reach the reasoning service.";

      throw new Error(openAIMessage);
    }

    const outputText =
      extractOutputText(data);

    if (!outputText) {
      throw new Error(
        "KAI returned no readable response.",
      );
    }

    let parsed: KaiChatResult;

    try {
      parsed = JSON.parse(
        outputText,
      ) as KaiChatResult;
    } catch {
      throw new Error(
        "KAI returned a response KWEVORA could not read.",
      );
    }

    const reply =
      cleanText(parsed.reply);

    if (!reply) {
      throw new Error(
        "KAI returned no conversation reply.",
      );
    }

    const proposedDirectives =
      cleanStringArray(
        parsed.newDirectives,
      );

    const newDirectives =
      removeDuplicateDirectives(
        proposedDirectives,
        directives,
      );

    const research =
      cleanResearch(
        parsed.research,
      );

    return NextResponse.json({
      success: true,
      reply,
      newDirectives,
      research,
    });
  } catch (error) {
    console.error(
      "KWEVORA Talk to KAI failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KAI could not complete the conversation.",
      },
      { status: 500 },
    );
  }
}