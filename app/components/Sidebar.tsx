"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    icon: "🏠",
    label: "Home",
    matchingPaths: ["/", "/dashboard", "/overnight", "/review", "/publishing"],
  },
  {
    href: "/video-studio",
    icon: "➕",
    label: "Create",
    matchingPaths: ["/video-studio", "/hook-generator"],
  },
  {
    href: "/kai",
    icon: "📊",
    label: "Business",
    matchingPaths: ["/kai", "/game-plan"],
  },
  {
    href: "/review",
    icon: "📚",
    label: "Library",
    matchingPaths: ["/review"],
  },
  {
    href: "/settings",
    icon: "⚙️",
    label: "Settings",
    matchingPaths: ["/settings"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#05030d] px-5 py-7">
      <div>
        <Link href="/" className="block">
          <h1 className="text-xl font-black tracking-[0.32em] text-purple-300">
            KWEVORA
          </h1>
        </Link>

        <nav className="mt-10 space-y-2">
          {items.map((item) => {
            const active = item.matchingPaths.some((path) => {
              if (path === "/") {
                return pathname === "/";
              }

              return pathname === path || pathname.startsWith(`${path}/`);
            });

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 transition ${
                  active
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-950/40"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-xl">
                  {item.icon}
                </span>

                <span className="font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
          </span>

          <div>
            <p className="font-bold text-green-300">KAI is working</p>

            <p className="mt-1 text-xs leading-5 text-gray-400">
              Preparing your next completed task.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}