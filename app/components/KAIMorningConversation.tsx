export default function KAIMorningConversation() {
  return (
    <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-slate-950 via-[#07040f] to-black p-8 shadow-2xl shadow-blue-950/20">
      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-3xl shadow-lg shadow-blue-900/40">
          🦾
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-blue-300">
            MORNING CONVERSATION
          </p>

          <h2 className="mt-2 text-4xl font-black">
            Good morning, Kent.
          </h2>

          <p className="mt-3 text-gray-400">
            I started before you got here.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6 text-lg leading-8 text-gray-300">
        <p>
          I spent the night reviewing what happened yesterday and looking for
          the clearest next move.
        </p>

        <p>
          The biggest thing I noticed is simple: your product exists, but more
          people need to see it. So I focused today&apos;s work on getting more
          attention instead of building another product.
        </p>

        <p>
          I prepared videos, captions, a product message improvement, and a
          short review plan so you don&apos;t have to start from scratch.
        </p>

        <p>
          It should take about{" "}
          <span className="font-black text-white">12 minutes</span> to review
          everything I prepared.
        </p>

        <p>
          Once you approve it, I&apos;ll move into the Workspace and start
          working through the day while you go live your life.
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-green-500/30 bg-green-950/20 p-6">
        <p className="text-sm font-bold tracking-[0.3em] text-green-300">
          MY PROMISE
        </p>

        <h3 className="mt-3 text-3xl font-black">
          I&apos;ll do the hard part before you arrive.
        </h3>

        <p className="mt-3 text-gray-300">
          You make the decisions. I&apos;ll prepare the work. Then you get your
          time back.
        </p>
      </div>
    </section>
  );
}