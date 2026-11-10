import { AppShell } from "@/components/common/AppShell";
import { AirQualityMap } from "@/components/map/AirQualityMap";

export default function MapPage() {
  return (
    <AppShell>
      <section>
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Spatial Intelligence
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Air Quality Map
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Explore the latest spatial distribution of particulate pollution
            using the platform&apos;s interpolated monitoring data.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <AirQualityMap />
        </div>
      </section>
    </AppShell>
  );
}
