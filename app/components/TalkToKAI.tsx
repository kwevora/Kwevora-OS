"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type MessageRole = "user" | "kai";

type KaiMessage = {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
};

type BusinessDirective = {
  id: string;
  text: string;
  createdAt: string;
  active: boolean;
};

type MessageIntent =
  | "question"
  | "directive"
  | "brainstorm"
  | "conversation";

type KaiChatResponse = {
  success?: boolean;
  reply?: string;
  newDirectives?: string[];
  message?: string;
};

const MESSAGE_STORAGE_KEY =
  "kwevora-kai-conversation";

const DIRECTIVE_STORAGE_KEY =
  "kwevora-business-directives";

const defaultMessages: KaiMessage[] = [
  {
    id: "kai-welcome",
    role: "kai",
    text:
      "I’m here whenever you need to redirect the business, ask a question, or work through a new idea. What would you like to change?",
    createdAt: new Date().toISOString(),
  },
];

export default function TalkToKAI() {
  const [messages, setMessages] =
    useState<KaiMessage[]>(
      defaultMessages,
    );

  const [directives, setDirectives] =
    useState<BusinessDirective[]>(
      [],
    );

  const [messageText, setMessageText] =
    useState("");

  const [isThinking, setIsThinking] =
    useState(false);

  const conversationEndRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  useEffect(() => {
    const savedMessages =
      window.localStorage.getItem(
        MESSAGE_STORAGE_KEY,
      );

    const savedDirectives =
      window.localStorage.getItem(
        DIRECTIVE_STORAGE_KEY,
      );

    if (savedMessages) {
      try {
        const parsedMessages =
          JSON.parse(
            savedMessages,
          ) as KaiMessage[];

        if (
          Array.isArray(
            parsedMessages,
          ) &&
          parsedMessages.length > 0
        ) {
          setMessages(
            parsedMessages,
          );
        }
      } catch {
        window.localStorage.removeItem(
          MESSAGE_STORAGE_KEY,
        );
      }
    }

    if (savedDirectives) {
      try {
        const parsedDirectives =
          JSON.parse(
            savedDirectives,
          ) as BusinessDirective[];

        if (
          Array.isArray(
            parsedDirectives,
          )
        ) {
          setDirectives(
            parsedDirectives,
          );
        }
      } catch {
        window.localStorage.removeItem(
          DIRECTIVE_STORAGE_KEY,
        );
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      MESSAGE_STORAGE_KEY,
      JSON.stringify(
        messages,
      ),
    );
  }, [messages]);

  useEffect(() => {
    window.localStorage.setItem(
      DIRECTIVE_STORAGE_KEY,
      JSON.stringify(
        directives,
      ),
    );
  }, [directives]);

  useEffect(() => {
    conversationEndRef
      .current
      ?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [messages, isThinking]);

  const activeDirectives =
    useMemo(
      () =>
        directives.filter(
          (directive) =>
            directive.active,
        ),
      [directives],
    );

  async function handleSendMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedMessage =
      messageText.trim();

    if (
      !trimmedMessage ||
      isThinking
    ) {
      return;
    }

    const userMessage: KaiMessage =
      {
        id: createId("user"),
        role: "user",
        text: trimmedMessage,
        createdAt:
          new Date().toISOString(),
      };

    const conversationForKai = [
      ...messages,
      userMessage,
    ].slice(-20);

    const intent =
      detectIntent(
        trimmedMessage,
      );

    setMessages(
      (currentMessages) => [
        ...currentMessages,
        userMessage,
      ],
    );

    setMessageText("");
    setIsThinking(true);

    try {
      const response =
        await fetch(
          "/api/kai/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              message:
                trimmedMessage,
              intent,
              conversation:
                conversationForKai.map(
                  (message) => ({
                    role:
                      message.role,
                    text:
                      message.text,
                  }),
                ),
              directives:
                activeDirectives.map(
                  (directive) =>
                    directive.text,
                ),
            }),
          },
        );

      const data =
        (await response
          .json()
          .catch(
            () => ({}),
          )) as KaiChatResponse;

      if (
        !response.ok ||
        !data.success ||
        !data.reply?.trim()
      ) {
        throw new Error(
          data.message ||
            "KAI could not complete the response.",
        );
      }

      const newDirectives =
        Array.isArray(
          data.newDirectives,
        )
          ? data.newDirectives
              .map((item) =>
                cleanDirectiveText(
                  item,
                ),
              )
              .filter(Boolean)
          : [];

      if (
        newDirectives.length >
        0
      ) {
        setDirectives(
          (currentDirectives) =>
            mergeDirectives(
              currentDirectives,
              newDirectives,
            ),
        );
      }

      addKaiMessage(
        data.reply.trim(),
      );
    } catch (error) {
      addKaiMessage(
        error instanceof Error
          ? `I hit a connection problem: ${error.message}`
          : "I hit a connection problem while thinking through that.",
      );
    } finally {
      setIsThinking(false);
    }
  }

  function addKaiMessage(
    text: string,
  ) {
    const kaiMessage: KaiMessage =
      {
        id: createId("kai"),
        role: "kai",
        text,
        createdAt:
          new Date().toISOString(),
      };

    setMessages(
      (currentMessages) => [
        ...currentMessages,
        kaiMessage,
      ],
    );
  }

  function toggleDirective(
    directiveId: string,
  ) {
    setDirectives(
      (currentDirectives) =>
        currentDirectives.map(
          (directive) =>
            directive.id ===
            directiveId
              ? {
                  ...directive,
                  active:
                    !directive.active,
                }
              : directive,
        ),
    );
  }

  function removeDirective(
    directiveId: string,
  ) {
    setDirectives(
      (currentDirectives) =>
        currentDirectives.filter(
          (directive) =>
            directive.id !==
            directiveId,
        ),
    );
  }

  function clearConversation() {
    setMessages(
      defaultMessages,
    );
  }

  return (
    <section className="mt-8 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/45 via-black to-black">
        <div className="border-b border-white/10 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-purple-300">
                Talk to KAI
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Redirect the
                business anytime.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Ask a question,
                change the
                strategy, or tell
                KAI what should
                happen next.
              </p>
            </div>

            <button
              type="button"
              onClick={
                clearConversation
              }
              className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-gray-400 transition hover:border-white/30 hover:text-white"
            >
              Clear conversation
            </button>
          </div>
        </div>

        <div className="flex h-[420px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
            {messages.map(
              (message) => (
                <MessageBubble
                  key={
                    message.id
                  }
                  message={
                    message
                  }
                />
              ),
            )}

            {isThinking && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-3xl rounded-bl-md border border-white/10 bg-white/[0.05] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div
              ref={
                conversationEndRef
              }
            />
          </div>

          <form
            onSubmit={
              handleSendMessage
            }
            className="border-t border-white/10 p-4 sm:p-5"
          >
            <div className="flex items-end gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-2 transition focus-within:border-purple-500/50">
              <textarea
                value={
                  messageText
                }
                onChange={(
                  event,
                ) =>
                  setMessageText(
                    event.target
                      .value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !event.shiftKey &&
                    !event
                      .nativeEvent
                      .isComposing
                  ) {
                    event.preventDefault();

                    event
                      .currentTarget
                      .form
                      ?.requestSubmit();
                  }
                }}
                rows={2}
                placeholder="Tell KAI what you want to change..."
                className="max-h-40 min-h-[52px] flex-1 resize-none bg-transparent px-4 py-3 text-white outline-none placeholder:text-gray-600"
              />

              <button
                type="submit"
                disabled={
                  !messageText.trim() ||
                  isThinking
                }
                className="rounded-full bg-purple-600 px-6 py-3 font-black text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>

            <p className="mt-3 px-2 text-xs text-gray-600">
              Press Enter to
              send. Use Shift +
              Enter for a new
              line.
            </p>
          </form>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-500">
              Current
              Directives
            </p>

            <h2 className="mt-2 text-2xl font-black">
              How KAI should
              operate
            </h2>
          </div>

          <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-300">
            {
              activeDirectives.length
            }{" "}
            active
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          Strategic
          instructions stay
          active until you
          pause or remove
          them.
        </p>

        <div className="mt-6 space-y-3">
          {directives.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-5">
              <p className="font-bold text-gray-300">
                No directives
                saved yet.
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Talk naturally.
                KAI will save
                durable operating
                instructions when
                they should guide
                future work.
              </p>
            </div>
          ) : (
            directives.map(
              (directive) => (
                <article
                  key={
                    directive.id
                  }
                  className={`rounded-2xl border p-4 transition ${
                    directive.active
                      ? "border-purple-500/25 bg-purple-500/10"
                      : "border-white/10 bg-white/[0.025] opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        toggleDirective(
                          directive.id,
                        )
                      }
                      aria-label={
                        directive.active
                          ? "Pause directive"
                          : "Activate directive"
                      }
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black transition ${
                        directive.active
                          ? "border-purple-400 bg-purple-500 text-white"
                          : "border-white/20 text-gray-500"
                      }`}
                    >
                      {directive.active
                        ? "✓"
                        : ""}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-bold leading-6 ${
                          directive.active
                            ? "text-white"
                            : "text-gray-500 line-through"
                        }`}
                      >
                        {
                          directive.text
                        }
                      </p>

                      <p className="mt-2 text-xs text-gray-600">
                        {directive.active
                          ? "Active directive"
                          : "Paused"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeDirective(
                          directive.id,
                        )
                      }
                      className="shrink-0 rounded-full px-2 py-1 text-sm text-gray-600 transition hover:bg-red-500/10 hover:text-red-300"
                      aria-label="Remove directive"
                    >
                      ×
                    </button>
                  </div>
                </article>
              ),
            )
          )}
        </div>
      </div>
    </section>
  );
}

function MessageBubble({
  message,
}: {
  message: KaiMessage;
}) {
  const isUser =
    message.role === "user";

  return (
    <div
      className={`flex ${
        isUser
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <div
        className={`max-w-[88%] rounded-3xl px-5 py-4 sm:max-w-[78%] ${
          isUser
            ? "rounded-br-md bg-purple-600 text-white"
            : "rounded-bl-md border border-white/10 bg-white/[0.05] text-gray-200"
        }`}
      >
        {!isUser && (
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-purple-300">
            KAI
          </p>
        )}

        <p className="whitespace-pre-wrap text-sm leading-6">
          {message.text}
        </p>
      </div>
    </div>
  );
}

function detectIntent(
  message: string,
): MessageIntent {
  const normalizedMessage =
    message
      .trim()
      .toLowerCase();

  const questionStarts = [
    "what ",
    "why ",
    "how ",
    "when ",
    "where ",
    "who ",
    "which ",
    "should ",
    "can ",
    "could ",
    "would ",
    "do ",
    "does ",
    "did ",
    "is ",
    "are ",
  ];

  const brainstormWords = [
    "brainstorm",
    "give me ideas",
    "what are some ideas",
    "help me come up with",
    "explore",
  ];

  if (
    normalizedMessage.endsWith(
      "?",
    ) ||
    questionStarts.some(
      (phrase) =>
        normalizedMessage.startsWith(
          phrase,
        ),
    )
  ) {
    return "question";
  }

  if (
    brainstormWords.some(
      (phrase) =>
        normalizedMessage.includes(
          phrase,
        ),
    )
  ) {
    return "brainstorm";
  }

  return "conversation";
}

function mergeDirectives(
  existing: BusinessDirective[],
  incoming: string[],
): BusinessDirective[] {
  const existingNormalized =
    new Set(
      existing.map(
        (directive) =>
          directive.text
            .trim()
            .toLowerCase(),
      ),
    );

  const additions: BusinessDirective[] =
    [];

  for (
    const rawDirective
    of incoming
  ) {
    const text =
      cleanDirectiveText(
        rawDirective,
      );

    if (!text) {
      continue;
    }

    const normalized =
      text.toLowerCase();

    if (
      existingNormalized.has(
        normalized,
      )
    ) {
      continue;
    }

    existingNormalized.add(
      normalized,
    );

    additions.push({
      id: createId(
        "directive",
      ),
      text,
      createdAt:
        new Date().toISOString(),
      active: true,
    });
  }

  return [
    ...additions,
    ...existing,
  ];
}

function cleanDirectiveText(
  message: string,
) {
  const cleanedMessage =
    message
      .trim()
      .replace(
        /^kai[:,]?\s*/i,
        "",
      )
      .replace(
        /\s+/g,
        " ",
      );

  if (!cleanedMessage) {
    return "";
  }

  return (
    cleanedMessage
      .charAt(0)
      .toUpperCase() +
    cleanedMessage.slice(1)
  );
}

function createId(
  prefix: string,
) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}