import { kaiMind } from "../lib/kaiMind";

export default function KAIMemory() {
  const memory = kaiMind.memory;

  return (
    <section className="rounded-3xl border border-purple-500/30 bg-purple-950/20 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-purple-300">
        KAI MEMORY
      </p>

      <h2 className="mt-4 text-4xl font-black">
        I remember where we left off.
      </h2>

      <p className="mt-4 max-w-4xl text-gray-300">
        Every morning should continue the story, not start a new one.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <MemoryCard
          title="What we decided"
          text={memory.whatWeDecided}
        />

        <MemoryCard
          title="What I learned"
          text={memory.whatKaiLearned}
        />

        <MemoryCard
          title="We'll keep doing"
          text={memory.whatToKeepDoing}
        />

        <MemoryCard
          title="We'll avoid"
          text={memory.whatToAvoid}
        />
      </div>

      <div className="mt-8 rounded-3xl border border-green-500/30 bg-green-950/20 p-6">
        <p className="text-sm font-bold tracking-[0.3em] text-green-300">
          WHY I REMEMBER
        </p>

        <h3 className="mt-3 text-3xl font-black">
          Tomorrow should always begin smarter than today.
        </h3>

        <p className="mt-3 text-gray-300">
          Every decision we make together becomes part of how I help you tomorrow.
        </p>
      </div>
    </section>
  );
}

function MemoryCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-black/40 p-5">
      <h3 className="text-2xl font-black">{title}</h3>

      <p className="mt-3 leading-7 text-gray-400">
        {text}
      </p>
    </div>
  );
}