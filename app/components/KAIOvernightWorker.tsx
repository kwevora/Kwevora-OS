"use client";

const tasks = [
  {
    title: "Generated today's content ideas",
    description:
      "Prepared new post concepts before you started your morning.",
    status: "Complete",
  },
  {
    title: "Reviewed saved memory",
    description:
      "Checked everything you've asked me to remember before planning.",
    status: "Complete",
  },
  {
    title: "Built today's game plan",
    description:
      "Organized today's work around your highest priority.",
    status: "Complete",
  },
  {
    title: "Prepared one morning question",
    description:
      "Generated the one question that would improve today's plan.",
    status: "Ready",
  },
];

export default function KAIOvernightWorker() {
  return (
    <section className="rounded-3xl border border-indigo-500/30 bg-indigo-950/20 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-indigo-300">
        OVERNIGHT WORKER
      </p>

      <h2 className="mt-3 text-4xl font-black">
        Here's everything I finished while you slept.
      </h2>

      <div className="mt-8 space-y-4">
        {tasks.map((task) => (
          <div
            key={task.title}
            className="rounded-2xl border border-white/10 bg-black/20 p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">{task.title}</h3>

              <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-300">
                {task.status}
              </span>
            </div>

            <p className="mt-3 text-gray-300">
              {task.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}