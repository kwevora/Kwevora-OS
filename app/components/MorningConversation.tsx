import { runKaiDecisionEngine } from "../lib/kaiDecisionEngine";

export default function MorningConversation() {
  const decision = runKaiDecisionEngine({
    businessName: "KWEVORA",
    ownerName: "Kent",
  });

  const topCompletedWork = decision.whatHappened.slice(0, 3);
  const nextActions = decision.prepareNext.slice(0, 3);

  return (
    <section className="overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/25 via-black to-purple-950/25">
      <div className="p-8 sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[0.35em] text-blue-300">
              MORNING CONVERSATION
            </p>

            <h2 className="mt-4 text-4xl font-black sm:text-5xl">
              Good morning, Kent.
            </h2>
          </div>

          <div className="w-fit rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>

              <span className="text-sm font-bold text-green-300">
                I&apos;ve been working
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 max-w-4xl space-y-5 text-lg leading-8 text-gray-300">
          <p>
            While you were away, I reviewed what changed, organized what matters
            most, and prepared the next move for KWEVORA.
          </p>

          <p>
            Based on what I found,{" "}
            <span className="font-bold text-white">
              {decision.recommendation}
            </span>
          </p>

          <p>{decision.reason}</p>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          <ConversationCard
            number="1"
            label="What I finished"
            title="Your day is prepared"
          >
            <ul className="space-y-3">
              {topCompletedWork.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-green-400">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </ConversationCard>

          <ConversationCard
            number="2"
            label="What I learned"
            title={decision.evidence[0]?.label || "The next move is clearer"}
          >
            <p>
              {decision.evidence[0]?.meaning ||
                "Completing valuable work is more important than adding more screens."}
            </p>
          </ConversationCard>

          <ConversationCard
            number="3"
            label="What I recommend"
            title="Today&apos;s best move"
          >
            <p>{decision.recommendation}</p>

            <div className="mt-4 inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">
              {decision.confidence}% confidence
            </div>
          </ConversationCard>
        </div>

        <div className="mt-8 rounded-3xl border border-purple-500/30 bg-purple-500/10 p-6">
          <p className="text-sm font-bold tracking-[0.28em] text-purple-300">
            WHAT I&apos;M DOING NEXT
          </p>

          <div className="mt-5 space-y-3">
            {nextActions.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-40" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-500" />
                </span>

                <p className="text-gray-200">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-yellow-500/25 bg-yellow-500/10 p-6">
          <p className="text-sm font-bold tracking-[0.28em] text-yellow-300">
            ONE QUESTION
          </p>

          <h3 className="mt-3 text-2xl font-black">
            {decision.morningQuestion.question}
          </h3>

          <p className="mt-3 max-w-3xl leading-7 text-gray-400">
            {decision.morningQuestion.reason}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {decision.morningQuestion.options.map((option) => (
              <button
                key={option}
                type="button"
                className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-2.5 font-bold text-yellow-100 transition hover:bg-yellow-400/20"
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-green-500/30 bg-green-950/20 p-6">
          <p className="text-sm font-bold tracking-[0.3em] text-green-300">
            HANDOFF
          </p>

          <h3 className="mt-3 text-3xl font-black">
            I&apos;ll take it from here.
          </h3>

          <p className="mt-3 text-lg text-gray-300">
            One step closer. Go live your life.
          </p>
        </div>
      </div>
    </section>
  );
}

function ConversationCard({
  number,
  label,
  title,
  children,
}: {
  number: string;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15 font-black text-blue-300">
        {number}
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
        {label}
      </p>

      <h3 className="mt-2 text-xl font-black">{title}</h3>

      <div className="mt-4 leading-7 text-gray-300">{children}</div>
    </article>
  );
}