import { kaiOrgans } from "../lib/kaiOrgans";

export default function KAIBrainOrgans() {
  const organs = [
    {
      title: "🧠 Memory",
      text: kaiOrgans.memory.lessonLearned,
      color: "border-blue-500/30",
    },
    {
      title: "👀 Observation",
      text: kaiOrgans.observation.whatStoodOut,
      color: "border-cyan-500/30",
    },
    {
      title: "🤔 Reasoning",
      text: kaiOrgans.reasoning.conclusion,
      color: "border-yellow-500/30",
    },
    {
      title: "✅ Decision",
      text: kaiOrgans.decision.recommendation,
      color: "border-green-500/30",
    },
  ];

  return (
    <section className="rounded-3xl border border-purple-500/30 bg-purple-950/10 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-purple-300">
        HOW MY BRAIN WORKS
      </p>

      <h2 className="mt-4 text-4xl font-black">
        Every recommendation comes from four organs.
      </h2>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {organs.map((organ) => (
          <div
            key={organ.title}
            className={`rounded-2xl border ${organ.color} bg-black/30 p-6`}
          >
            <h3 className="text-2xl font-black">
              {organ.title}
            </h3>

            <p className="mt-4 leading-8 text-gray-300">
              {organ.text}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6">
        <h3 className="text-2xl font-black">
          Why this matters
        </h3>

        <p className="mt-4 leading-8 text-gray-300">
          Instead of jumping straight to an answer, I remember what we've
          learned, observe what's changing, reason through what matters most,
          and then make one clear recommendation.
        </p>
      </div>
    </section>
  );
}