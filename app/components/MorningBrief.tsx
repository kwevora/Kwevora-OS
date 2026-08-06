type BriefItem = {
  icon: string;
  title: string;
  count: string;
  description: string;
};

const briefItems: BriefItem[] = [
  {
    icon: "🎥",
    title: "Videos Ready",
    count: "3",
    description: "Faceless short-form videos prepared for review.",
  },
  {
    icon: "✍️",
    title: "Posts Written",
    count: "5",
    description: "Captions and social posts drafted by KAI.",
  },
  {
    icon: "📦",
    title: "Product Updates",
    count: "1",
    description: "One Escape Plan improvement prepared.",
  },
  {
    icon: "📈",
    title: "Growth Insights",
    count: "2",
    description: "Opportunities found for today’s content.",
  },
];

export default function MorningBrief() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div>
        <p className="text-sm font-bold tracking-[0.3em] text-purple-400">
          MORNING BRIEF
        </p>
        <h2 className="mt-3 text-3xl font-black">
          KAI prepared your day.
        </h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {briefItems.map((item) => (
          <div key={item.title} className="rounded-2xl bg-black/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-3xl">{item.icon}</span>
              <span className="text-3xl font-black text-purple-300">
                {item.count}
              </span>
            </div>

            <h3 className="mt-5 font-bold">{item.title}</h3>
            <p className="mt-2 text-sm text-gray-400">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}