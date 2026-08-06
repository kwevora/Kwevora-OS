const activityItems = [
  {
    time: "8:03 AM",
    status: "Done",
    title: "Researched today’s content opportunities",
    detail: "KAI found traffic is still the highest-leverage focus.",
  },
  {
    time: "8:07 AM",
    status: "Done",
    title: "Drafted One Step Closer Video #21",
    detail: "A new faceless video concept is ready for approval.",
  },
  {
    time: "8:11 AM",
    status: "Done",
    title: "Generated five social captions",
    detail: "Captions were written to point viewers toward The Escape Plan.",
  },
  {
    time: "8:16 AM",
    status: "Working",
    title: "Monitoring overnight analytics",
    detail: "KAI is checking what changed since the last review.",
  },
  {
    time: "8:18 AM",
    status: "Queued",
    title: "Preparing tomorrow’s game plan",
    detail: "KAI will use today’s approvals to improve tomorrow’s plan.",
  },
];

export default function KAIActivityFeed() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.3em] text-green-300">
            LIVE ACTIVITY
          </p>
          <h2 className="mt-3 text-3xl font-black">
            What KAI is doing now.
          </h2>
        </div>

        <div className="rounded-full border border-green-500/40 bg-green-950/40 px-5 py-2 text-sm font-bold text-green-300">
          ● LIVE
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {activityItems.map((item) => (
          <div key={item.time} className="rounded-2xl bg-black/40 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-purple-300">
                  {item.time}
                </p>
                <h3 className="mt-2 text-xl font-black">{item.title}</h3>
                <p className="mt-2 text-gray-400">{item.detail}</p>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  item.status === "Done"
                    ? "bg-green-600/20 text-green-300"
                    : item.status === "Working"
                    ? "bg-purple-600/20 text-purple-300"
                    : "bg-gray-600/20 text-gray-300"
                }`}
              >
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}