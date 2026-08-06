import { kaiMind } from "../lib/kaiMind";

export default function KAIDesk() {
  const desk = kaiMind.desk;

  const sections = [
    {
      title: "On My Desk",
      items: desk.onMyDesk,
      color: "text-green-300",
      border: "border-green-500/30",
      bg: "bg-green-950/20",
    },
    {
      title: "I'm Watching",
      items: desk.watching,
      color: "text-blue-300",
      border: "border-blue-500/30",
      bg: "bg-blue-950/20",
    },
    {
      title: "Something I'm Exploring",
      items: desk.exploring,
      color: "text-purple-300",
      border: "border-purple-500/30",
      bg: "bg-purple-950/20",
    },
    {
      title: "Waiting On You",
      items: desk.waitingOnYou,
      color: "text-yellow-300",
      border: "border-yellow-500/30",
      bg: "bg-yellow-950/20",
    },
    {
      title: "Already Finished",
      items: desk.alreadyFinished,
      color: "text-gray-300",
      border: "border-white/10",
      bg: "bg-white/5",
    },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-purple-300">
        KAI'S DESK
      </p>

      <h2 className="mt-4 text-4xl font-black">
        Here's where things stand.
      </h2>

      <p className="mt-4 max-w-4xl text-gray-400">
        This isn't a task list. It's how I'm organizing today's work so you
        don't have to carry it all in your head.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.title}
            className={`rounded-3xl border ${section.border} ${section.bg} p-6`}
          >
            <h3 className={`text-2xl font-black ${section.color}`}>
              {section.title}
            </h3>

            <div className="mt-5 space-y-3">
              {section.items.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-black/40 p-4"
                >
                  <p className="font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-green-500/30 bg-green-950/20 p-6">
        <p className="text-sm font-bold tracking-[0.3em] text-green-300">
          TODAY'S DIRECTION
        </p>

        <h3 className="mt-3 text-3xl font-black">
          {kaiMind.recommendation.title}
        </h3>

        <p className="mt-4 text-lg leading-8 text-gray-300">
          {kaiMind.recommendation.reason}
        </p>

        <div className="mt-6 rounded-2xl bg-black/40 p-5">
          <p className="font-bold text-green-300">
            Confidence: {kaiMind.recommendation.confidence}%
          </p>

          <div className="mt-4 space-y-2">
            {kaiMind.recommendation.evidence.map((fact) => (
              <p key={fact} className="text-gray-300">
                • {fact}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}