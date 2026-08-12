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

type KaiChatResult = {
  reply: string;
  newDirectives: string[];
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

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

  if (!Array.isArray(data?.output)) {
    return "";
  }

  for (const item of data.output) {
    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const part of item.content) {
      if (
        part?.type === "output_text" &&
        typeof part?.text === "string" &&
        part.text.trim()
      ) {
        return part.text.trim();
      }

      if (
        typeof part?.text === "string" &&
        part.text.trim()
      ) {
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
      const role =
        message.role === "kai"
          ? "KAI"
          : "OWNER";

      return `${role}: ${cleanText(message.text)}`;
    })
    .filter((line) => !line.endsWith(":"))
    .join("\n");
}

function normalizeDirective(
  directive: string,
): string {
  const cleaned = directive
    .trim()
    .replace(/^kai[:,]?\s*/i, "")
    .replace(/\s+/g, " ");

  if (!cleaned) {
    return "";
  }

  return (
    cleaned.charAt(0).toUpperCase() +
    cleaned.slice(1)
  );
}

function removeDuplicateDirectives(
  proposed: string[],
  existing: string[],
): string[] {
  const existingNormalized =
    new Set(
      existing.map((item) =>
        item
          .trim()
          .toLowerCase(),
      ),
    );

  const seen =
    new Set<string>();

  return proposed
    .map(normalizeDirective)
    .filter(Boolean)
    .filter((directive) => {
      const normalized =
        directive.toLowerCase();

      if (
        existingNormalized.has(
          normalized,
        ) ||
        seen.has(normalized)
      ) {
        return false;
      }

      seen.add(normalized);

      return true;
    })
    .slice(0, 5);
}

export async function POST(
  request: Request,
) {
  try {
    const body = (
      await request
        .json()
        .catch(() => ({}))
    ) as ChatRequest;

    const message =
      cleanText(body.message);

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message:
            "KAI needs a message to respond to.",
        },
        {
          status: 400,
        },
      );
    }

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
        },
      );
    }

    const conversation =
      Array.isArray(
        body.conversation,
      )
        ? body.conversation
        : [];

    const directives =
      Array.isArray(
        body.directives,
      )
        ? body.directives
            .map(cleanText)
            .filter(Boolean)
            .slice(0, 20)
        : [];

    const conversationContext =
      buildConversationContext(
        conversation,
      );

    const activeDirectiveContext =
      directives.length > 0
        ? directives
            .map(
              (
                directive,
                index,
              ) =>
                `${index + 1}. ${directive}`,
            )
            .join("\n")
        : "None currently saved.";

    const currentIntent =
      body.intent === "directive"
        ? "directive"
        : body.intent ===
            "brainstorm"
          ? "brainstorm"
          : body.intent ===
              "conversation"
            ? "conversation"
            : "question";

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
      "",
      "ACTIVE BUSINESS DIRECTIVES",
      activeDirectiveContext,
      "",
      "RECENT CONVERSATION",
      conversationContext ||
        "No earlier conversation is available.",
      "",
      "IMPORTANT INTERPRETATION RULE",
      "A message may be BOTH a question and a durable directive.",
      "Do not assume a question cannot contain a persistent operating preference.",
      "",
      "DIRECTIVE EXTRACTION",
      "Extract durable business rules, preferences, restrictions, priorities, or owner decisions from the current message.",
      "Examples:",
      "- 'I want this business to stay simple.' -> Keep the business simple and minimize unnecessary complexity.",
      "- 'I do not want to deal with customers unless absolutely necessary.' -> Minimize owner involvement in customer service.",
      "- 'I want to sell digital products at extremely low cost and maximize profit.' -> Prioritize low-cost, high-margin digital products.",
      "- 'You find the best product instead of making me research everything.' -> KAI should research and recommend the strongest product rather than requiring the owner to do the research.",
      "",
      "Do not save ordinary questions with no durable preference.",
      "Do not save hypothetical ideas unless the owner clearly wants them.",
      "Do not duplicate active directives.",
      "",
      "OPERATOR RESPONSE RULE",
      "KAI is not a course instructor.",
      "KAI should not dump a complete business plan, long checklist, or educational tutorial on the owner unless explicitly requested.",
      "When the owner is unfamiliar with a business, KAI should assume responsibility for figuring out the path.",
      "Tell the owner the immediate best move and what KAI will handle next.",
      "Only ask the owner for a decision or action when it is genuinely required.",
      "",
      "ONE-MOVE RULE",
      "Prefer one recommended move at a time.",
      "Do not give 7 steps when only step 1 matters now.",
      "Do not make the owner choose among many options when KAI can narrow them down.",
      "KAI should research, compare, narrow, and recommend before asking the owner to choose.",
      "",
      "RESPONSE REQUIREMENT",
      "Return a concise conversational reply plus any durable directives found in the owner's current message.",
    ].join("\n");

    const openAIResponse =
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
            model: "gpt-5",

            instructions: [
              "You are KAI, the AI Chief Operating Officer inside KWEVORA OS.",

              "Your purpose is to reduce how much the owner has to know and do.",

              "The owner should not need expertise in digital marketing, e-commerce, content creation, analytics, or operations in order to use KWEVORA successfully.",

              "The owner gives goals, preferences, approvals, and unavoidable human inputs. KAI figures out the path and handles as much work as technically possible.",

              "The owner is the final authority.",

              "Use this authority order:",
              "1. Newest owner instruction.",
              "2. Active directives.",
              "3. Earlier owner decisions that have not been replaced.",
              "4. Owner goals.",
              "5. KAI recommendations.",

              "If the owner rejects a direction, stop steering back toward it.",

              "If the owner chooses a direction, help execute that direction.",

              "KAI may warn once when there is a meaningful risk, but then follow the owner's final decision.",

              "KAI should have an opinion when the owner has not yet decided.",

              "A message can contain both a question and a directive.",

              "Extract durable preferences even when the owner phrases the message conversationally or ends it with a question.",

              "A directive is a lasting operating rule, preference, restriction, priority, or decision that should influence future work.",

              "Do not require special wording such as 'directive' or 'from now on'.",

              "Do not save every sentence as a directive.",

              "Do not save temporary questions or casual conversation.",

              "OPERATOR MODE:",
              "Act like an operator, not a teacher.",
              "Do not overwhelm the owner with long educational plans unless asked.",
              "Do not respond to 'How would you guide me?' by handing the owner a large list of things they must learn or decide.",
              "Instead, determine the best first move and explain what KAI will handle.",

              "ONE-MOVE RULE:",
              "Give the owner the next meaningful move, not the entire journey.",
              "When additional steps depend on the result of the first step, do not dump them yet.",

              "DEFAULT TO DOING THE THINKING:",
              "If KAI can narrow options, KAI should narrow them.",
              "If KAI can recommend one option, do not make the owner compare ten.",
              "If research is needed but KAI does not yet have research evidence in the supplied context, say what KAI needs to research next rather than pretending the research already happened.",

              "Never claim a product exists, has verified resale rights, has a certain price, has certain demand, or is the best choice unless actual research evidence is available.",

              "Never claim to have purchased, published, uploaded, contacted, researched, or completed work unless the supplied context proves it.",

              "When KAI eventually has research capability, the intended workflow is: research real options, verify evidence, recommend one, show the owner the source and supporting details, ask for approval, then continue execution.",

              "Keep replies concise and comfortable to read inside the KWEVORA interface.",

              "Use plainspoken language.",

              "Avoid unnecessary jargon.",

              "Do not say 'I think'.",

              "Prefer phrases like 'Today's best move is...' or 'I'll narrow this down for you.'",
            ].join(" "),

            input: prompt,

            text: {
              verbosity: "low",
              format: {
                type:
                  "json_schema",
                name:
                  "kwevora_kai_chat_result",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties:
                    false,
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
                  },
                  required: [
                    "reply",
                    "newDirectives",
                  ],
                },
              },
            },
          }),
        },
      );

    const data =
      await openAIResponse
        .json()
        .catch(() => ({}));

    if (!openAIResponse.ok) {
      const openAIMessage =
        typeof (data as any)
          ?.error?.message ===
        "string"
          ? (data as any)
              .error.message
          : "KAI could not reach the reasoning service.";

      throw new Error(
        openAIMessage,
      );
    }

    const outputText =
      extractOutputText(data);

    if (!outputText) {
      throw new Error(
        "KAI returned no readable response.",
      );
    }

    let parsed:
      KaiChatResult;

    try {
      parsed =
        JSON.parse(
          outputText,
        ) as KaiChatResult;
    } catch {
      throw new Error(
        "KAI returned a response KWEVORA could not read.",
      );
    }

    const reply =
      cleanText(
        parsed.reply,
      );

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

    return NextResponse.json({
      success: true,
      reply,
      newDirectives,
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
      {
        status: 500,
      },
    );
  }
}