import { AppShell } from "@/components/common/AppShell";

const metrics = [
  {
    label: "Current AQI",
    value: "-",
    description: "Latest available reading",
  },
  {
    label: "PM2.5",
    value: "-",
    description: "Latest concentration",
  },
  {
    label: "Active Alerts",
    value: "-",
    description: "Threshold notifications",
  },
  {
    label: "Stations",
    value: "-",
    description: "Available monitoring locations",
  },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <section>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Overview
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Air Quality Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            A centralized view of current air quality, pollution levels,
            alerts, spatial patterns, and forecasts.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {metric.label}
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-950">
                {metric.value}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {metric.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Air Quality Map
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Spatial pollution distribution will appear here.
            </p>
          </section>

          <section className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Latest Alerts
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Active air-quality alerts will appear here.
            </p>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
