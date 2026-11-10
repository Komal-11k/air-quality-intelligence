import Link from "next/link";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/map", label: "Air Quality Map" },
  { href: "/history", label: "History" },
  { href: "/compare", label: "Compare" },
  { href: "/health", label: "Health" },
  { href: "/forecast", label: "Forecast" },
  { href: "/assistant", label: "Assistant" },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-sm font-bold text-white">
              AQ
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Air Quality Intelligence
              </p>
              <p className="text-xs text-slate-500">
                Real-time environmental intelligence
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col justify-center px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
            Real-time Air Quality Intelligence
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
            Understand the air.
            <span className="block text-teal-700">Act with intelligence.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Monitor air quality, explore spatial pollution patterns, analyze
            historical measurements, view forecasts, and receive health-aware
            insights from one platform.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Go to Dashboard
            </Link>

            <Link
              href="/map"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Explore Air Quality Map
            </Link>
          </div>
        </div>

        <nav className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-900">
                {item.label}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Explore this module
              </p>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
