export default function MorningReview() {
  return (
    <section className="rounded-3xl border border-purple-800 bg-black/70 p-8">
      <p className="text-sm font-bold tracking-[0.3em] text-purple-400">
        MORNING REVIEW
      </p>

      <h2 className="mt-4 text-4xl font-black">
        Here’s what KAI prepared.
      </h2>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {[
          ["🎬 Videos Prepared", "One Step Closer #18, #19, #20"],
          ["✍️ Posts Written", "TikTok, Instagram, Facebook, YouTube Shorts"],
          ["📦 Product Improvements", "Escape Plan landing page update"],
          ["📈 Growth Insights", "Traffic is the current bottleneck"],
        ].map(([title, desc]) => (
          <div key={title} className="rounded-2xl bg-white/5 p-5">
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-3 text-gray-400">{desc}</p>
            <button className="mt-5 rounded-xl bg-purple-700 px-4 py-2 font-semibold hover:bg-purple-600">
              Review
            </button>
          </div>
        ))}
      </div>

      <button className="mt-8 w-full rounded-2xl bg-purple-600 p-5 text-xl font-black hover:bg-purple-500">
        Approve Everything
      </button>
    </section>
  );
}