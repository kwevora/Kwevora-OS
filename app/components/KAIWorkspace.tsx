const queueItems = [
  ["✅", "Researching today’s trends", "Complete"],
  ["🔄", "Writing TikTok captions", "In progress"],
  ["⏳", "Building tomorrow’s review", "Queued"],
  ["⏳", "Checking yesterday’s analytics", "Queued"],
  ["⏳", "Preparing next content ideas", "Queued"],
];

export default function KAIWorkspace() {
  return (
    <section className="grid gap-6 xl:grid-cols-3">
      <div className="rounded-3xl border border-green-500/30 bg-green-950/20 p-6 xl:col-span-2">
        <p className="text-sm font-bold tracking-[0.3em] text-green-300">
          KAI IS WORKING ON
        </p>

        <h2 className="mt-4 text-4xl font-black">
          Writing today’s TikTok captions.
        </h2>

        <p className="mt-3 text-gray-300">
          KAI is turning today’s One Step Closer videos into captions that point
          people toward The Escape Plan.
        </p>

        <div className="mt-8">
          <div className="mb-2 flex justify-between text-sm text-gray-400">
            <span>Progress</span>
            <span>67%</span>
          </div>

          <div className="h-5 overflow-hidden rounded-full bg-black/50">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-purple-500 to-green-400"></div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-black/40 p-5">
            <p className="text-sm text-gray-400">Current task</p>
            <p className="mt-2 text-xl font-black">Captions</p>
          </div>

          <div className="rounded-2xl bg-black/40 p-5">
            <p className="text-sm text-gray-400">Estimated finish</p>
            <p className="mt-2 text-xl font-black">8 min</p>
          </div>

          <div className="rounded-2xl bg-black/40 p-5">
            <p className="text-sm text-gray-400">Priority</p>
            <p className="mt-2 text-xl font-black">Traffic</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-purple-800 bg-purple-950/30 p-6">
        <h3 className="text-2xl font-black">Today’s Queue</h3>

        <div className="mt-6 space-y-3">
          {queueItems.map(([icon, task, status]) => (
            <div key={task} className="rounded-2xl bg-black/40 p-4">
              <p className="font-bold">
                {icon} {task}
              </p>
              <p className="mt-1 text-sm text-gray-400">{status}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-purple-800 bg-gradient-to-br from-purple-950/70 to-black p-6 xl:col-span-2">
        <p className="text-sm font-bold tracking-[0.3em] text-purple-300">
          WHY KAI IS DOING THIS
        </p>

        <h3 className="mt-4 text-3xl font-black">
          Traffic creates leverage.
        </h3>

        <p className="mt-4 text-gray-300">
          The Escape Plan already exists. More people need to see it. That’s why
          KAI is prioritizing content before deeper product improvements today.
          More traffic makes every future product update more valuable.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-2xl font-black">Up Next</h3>

        <div className="mt-6 space-y-4">
          {[
            "Prepare tomorrow’s plan",
            "Analyze today’s performance",
            "Build new hook ideas",
            "Refresh approval queue",
          ].map((item) => (
            <div key={item} className="rounded-2xl bg-black/40 p-4">
              <p className="font-bold">🔮 {item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}