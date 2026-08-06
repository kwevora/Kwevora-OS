const insights = [
  {
    label: "What happened",
    title: "KAI reviewed yesterday’s activity.",
    text: "More attention is needed before building more products. Today’s plan focuses on getting more people to see The Escape Plan.",
  },
  {
    label: "Why it matters",
    title: "More eyes create more chances to sell.",
    text: "If nobody sees the offer, the product can’t grow. That’s why KAI prepared content first.",
  },
  {
    label: "What KAI prepared",
    title: "Today’s content push is ready.",
    text: "Three short videos, five captions, one product message improvement, and a simple review plan are ready for approval.",
  },
  {
    label: "What happens next",
    title: "Approve it, then KAI gets to work.",
    text: "Once approved, KAI moves into the workspace and starts scheduling, tracking, and preparing tomorrow.",
  },
];

export default function KAIOperatorBrief() {
  return (
    <section className="rounded-3xl border border-purple-800 bg-gradient-to-br from-purple-950/70 to-black p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-purple-300">
        KAI OPERATOR BRIEF
      </p>

      <h2 className="mt-4 text-4xl font-black">
        I found something you should see.
      </h2>

      <p className="mt-4 max-w-4xl text-gray-300">
        KAI is beginning to think like an operator: looking at what changed,
        explaining why it matters, and preparing your next move before you ask.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {insights.map((item) => (
          <div key={item.label} className="rounded-2xl bg-black/40 p-5">
            <p className="text-sm font-bold text-purple-300">{item.label}</p>
            <h3 className="mt-2 text-2xl font-black">{item.title}</h3>
            <p className="mt-3 text-gray-400">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}