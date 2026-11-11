"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/map", label: "Map" },
  { href: "/history", label: "History" },
  { href: "/compare", label: "Compare" },
  { href: "/health", label: "Health" },
  { href: "/forecast", label: "Forecast" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center px-4 sm:px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-xs font-bold text-white">
              AQ
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-none text-slate-950">
                Air Quality Intelligence
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Environmental intelligence platform
              </p>
            </div>
          </Link>

          <nav className="ml-auto flex items-center gap-1 overflow-x-auto">
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-teal-50 text-teal-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1600px] px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
