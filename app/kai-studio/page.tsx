import Sidebar from "../Sidebar";

export default function KAIStudio() {
  return (
    <main className="flex min-h-screen bg-black text-white">
      

      <section className="flex-1 p-8">
        <p className="text-sm font-bold tracking-widest text-purple-400">
          KWEVORA OS
        </p>

        <h1 className="mt-4 text-5xl font-black">KAI Studio</h1>

        <p className="mt-3 text-gray-300">
          Your daily content command center. Approve the plan once. KAI handles the rest.
        </p>

        <div className="mt-8 rounded-3xl border border-purple-500/30 bg-purple-950/30 p-8">
          <p className="text-purple-300">TODAY&apos;S CONTENT PLAN</p>

          <h2 className="mt-3 text-3xl font-bold">
            KAI recommends creating 3 videos today.
          </h2>

          <p className="mt-4 text-gray-300">
            Estimated morning review time: 45–60 minutes. After approval, KAI will schedule the videos throughout the day.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              "7:30 AM — Motivation Video",
              "12:15 PM — Escape Plan Video",
              "6:45 PM — Call-To-Action Video",
            ].map((video) => (
              <div key={video} className="rounded-2xl bg-black/40 p-5">
                <p className="text-purple-300">VIDEO</p>
                <h3 className="mt-2 text-xl font-bold">{video}</h3>
                <ul className="mt-4 space-y-2 text-sm text-gray-300">
                  <li>✅ Hook generated</li>
                  <li>✅ Script generated</li>
                  <li>✅ Caption generated</li>
                  <li>✅ Thumbnail idea ready</li>
                  <li>⬜ Video build pending</li>
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-black/40 p-6">
            <h3 className="text-2xl font-bold">KAI says:</h3>
            <p className="mt-3 text-gray-300">
              “Kent, I prepared today&apos;s content batch. Review the videos, approve the schedule, and I&apos;ll handle the rest.”
            </p>
          </div>

          <button className="mt-6 rounded-full bg-purple-600 px-6 py-3 font-bold hover:bg-purple-500">
            ✅ Approve Today&apos;s Content Plan
          </button>
        </div>
      </section>
    </main>
  );
}