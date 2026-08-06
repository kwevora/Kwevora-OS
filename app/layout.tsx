import type { Metadata } from "next";
import "./globals.css";

import Sidebar from "./components/Sidebar";
export const metadata: Metadata = {
  title: "KWEVORA OS",
  description: "Wake up. Approve your day. Go live your life.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en">
      <body className="bg-[#07040f] text-white">
        <div className="min-h-screen flex flex-col">
          <div className="flex flex-1">
  <Sidebar />

  <main className="min-w-0 flex-1">{children}</main>
</div>

          <footer className="border-t border-white/10 bg-black/30 px-6 py-4">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-center text-sm text-gray-400 md:flex-row">
              <p>
                © {currentYear} KWEVORA OS. All Rights Reserved.
              </p>

              <p>
                Wake up. Approve your day. Go live your life.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}