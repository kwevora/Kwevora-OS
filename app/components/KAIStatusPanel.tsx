import { getKaiState } from "../lib/kaiState";

export default function KAIStatusPanel() {
  const kaiState = getKaiState();

  return (
    <section className="rounded-3xl border border-green-500/30 bg-gradient-to-br from-green-950/20 via-black to-purple-950/20 p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-bold tracking-[0.35em] text-green-300">
            KAI STATUS
          </p>

          <h2 className="mt-4 text-4xl font-black">
            KAI is {kaiState.status}.
          </h2>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-300">
            Current focus: {kaiState.currentFocus}
          </p>
        </div>

        <div className="rounded-3xl border border-green-500/30 bg-green-950/20 p-5 text-right">
          <p className="text-sm text-gray-400">Confidence</p>

          <p className="mt-1 text-4xl font-black text-green-300">
            {kaiState.confidence}%
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card title="Mode" value={kaiState.mode} />
        <Card title="Priority" value={kaiState.priority} />
        <Card title="Waiting On" value={kaiState.waitingOn} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <List
          title="Current Work"
          items={kaiState.workingOn}
        />

        <List
          title="Learning From"
          items={kaiState.learningFrom}
        />
      </div>
    </section>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <p className="text-sm font-bold tracking-[0.25em] text-green-300">
        {title}
      </p>

      <h3 className="mt-3 text-2xl font-black">
        {value}
      </h3>
    </div>
  );
}

function List({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <h3 className="text-2xl font-black">
        {title}
      </h3>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-xl bg-white/5 p-4"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}