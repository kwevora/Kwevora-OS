import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="min-h-screen w-64 border-r border-white/10 bg-black p-6 text-white">
      <h1 className="text-xl font-black tracking-wide">KWEVORA OS</h1>
      <p className="mt-1 text-xs text-purple-400">One Step Closer</p>

      <nav className="mt-8 space-y-3">
        <Link className="block rounded-xl bg-white/10 px-4 py-3" href="/dashboard">
          🏠 Mission Control
        </Link>

        <Link className="block rounded-xl px-4 py-3 hover:bg-white/10" href="/kai-studio">
          🤖 KAI Command Center
        </Link>

        <Link className="block rounded-xl px-4 py-3 hover:bg-white/10" href="/video-studio">
          🎬 Video Studio
        </Link>

        <Link className="block rounded-xl px-4 py-3 hover:bg-white/10" href="/content-planner">
          📅 Content Planner
        </Link>

        <Link className="block rounded-xl px-4 py-3 hover:bg-white/10" href="/product-builder">
          📦 Product Builder
        </Link>

        <Link className="block rounded-xl px-4 py-3 hover:bg-white/10" href="/growth-tracker">
          📈 Growth Tracker
        </Link>

        <Link className="block rounded-xl px-4 py-3 hover:bg-white/10" href="/settings">
          ⚙️ Settings
        </Link>
      </nav>

      <div className="mt-10 rounded-2xl bg-purple-950/40 p-4">
        <p className="text-sm text-purple-300">KAI ONLINE ●</p>
        <p className="mt-2 text-xs text-gray-400">
          I&apos;ve done the hard part. Your only job is to approve.
        </p>
      </div>
    </aside>
  );
}