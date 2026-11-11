"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type ComparisonLocation, type Location } from "../../lib/api";
import { AppShell } from "../../components/common/AppShell";

const POLLUTANTS = [
  "PM2.5",
  "PM10",
  "NO2",
  "SO2",
  "CO",
  "O3",
];

const categoryClass = (category: string | null) => {
  switch (category) {
    case "Good":
      return "bg-emerald-100 text-emerald-800";
    case "Satisfactory":
      return "bg-yellow-100 text-yellow-800";
    case "Moderate":
      return "bg-orange-100 text-orange-800";
    case "Poor":
      return "bg-red-100 text-red-800";
    case "Very Poor":
      return "bg-purple-100 text-purple-800";
    case "Severe":
      return "bg-red-200 text-red-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const formatPollutant = (pollutant: string) => {
  if (pollutant === "NO2") return "NO₂";
  if (pollutant === "SO2") return "SO₂";
  if (pollutant === "O3") return "O₃";
  return pollutant;
};

const formatValue = (value: number | undefined) =>
  value === undefined ? "—" : value.toFixed(1);

const formatTime = (value: string | undefined) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function ComparePage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        setError(null);

        const response = await api.getLocations({
          limit: 50,
          offset: 0,
        });

        setLocations(response.locations);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load monitoring locations.",
        );
      } finally {
        setLoadingLocations(false);
      }
    };

    void loadLocations();
  }, []);

  const selectedLocations = useMemo(
    () =>
      selectedIds
        .map((id) => locations.find((location) => location.id === id))
        .filter((location): location is Location => location !== undefined),
    [locations, selectedIds],
  );

  const toggleLocation = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 5) {
        return current;
      }

      return [...current, id];
    });
  };

  const runComparison = async () => {
    if (selectedIds.length < 2) {
      setError("Select at least two locations to compare.");
      return;
    }

    try {
      setLoadingComparison(true);
      setError(null);

      const response = await api.compareLocations(selectedIds);

      setComparison(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to compare selected locations.",
      );
    } finally {
      setLoadingComparison(false);
    }
  };

  const getMeasurement = (
    location: ComparisonLocation,
    pollutant: string,
  ) => {
    return location.measurements.find(
      (measurement) => measurement.pollutant === pollutant,
    );
  };

  const bestAqi = useMemo(() => {
    const values = (comparison ?? [])
      .map((location) => location.aqi)
      .filter((value): value is number => value !== null);
  
    return values.length > 0 ? Math.min(...values) : null;
  }, [comparison]);

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
            Air Quality Intelligence
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Compare Locations
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Compare current measured air quality across monitoring locations.
            AQI values are calculated from the latest available pollutant
            measurements.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Select monitoring locations
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select 2–5 locations.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void runComparison()}
              disabled={
                selectedIds.length < 2 ||
                loadingComparison ||
                loadingLocations
              }
              className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingComparison ? "Comparing..." : "Compare locations"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loadingLocations ? (
              <p className="text-sm text-slate-500">
                Loading monitoring locations...
              </p>
            ) : locations.length === 0 ? (
              <p className="text-sm text-slate-500">
                No monitoring locations are available.
              </p>
            ) : (
              locations.map((location) => {
                const selected = selectedIds.includes(location.id);

                return (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => toggleLocation(location.id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-sky-500 bg-sky-50 ring-2 ring-sky-100"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {location.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {[location.city, location.region]
                            .filter(Boolean)
                            .join(", ") || "Location"}
                        </p>
                      </div>

                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          selected
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-slate-300 text-slate-400"
                        }`}
                      >
                        {selected ? "✓" : ""}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedIds.length > 0 && (
            <p className="mt-4 text-sm text-slate-500">
              {selectedIds.length} of 5 locations selected
            </p>
          )}
        </section>

        {comparison.length > 0 && (
          <section className="mt-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Current comparison
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Actual monitoring measurements. Each location uses its latest
                  available value for each pollutant.
                </p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {comparison.map((location) => {
                const isBest =
                  location.aqi !== null && location.aqi === bestAqi;

                return (
                  <article
                    key={location.locationId}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-slate-200 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {location.name}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {[location.city, location.region]
                              .filter(Boolean)
                              .join(", ") || "Location"}
                          </p>
                        </div>

                        {isBest && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                            Lowest AQI
                          </span>
                        )}
                      </div>

                      <div className="mt-5 flex items-end gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-500">
                            AQI
                          </p>

                          <p className="text-5xl font-bold text-slate-900">
                            {location.aqi ?? "—"}
                          </p>
                        </div>

                        <div className="pb-1">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${categoryClass(
                              location.category,
                            )}`}
                          >
                            {location.category ?? "Unavailable"}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-slate-600">
                        Dominant pollutant:{" "}
                        <span className="font-semibold">
                          {location.dominantPollutant
                            ? formatPollutant(location.dominantPollutant)
                            : "Unavailable"}
                        </span>
                      </p>
                    </div>

                    <div className="p-5">
                      <h4 className="mb-3 text-sm font-semibold text-slate-900">
                        Pollutants
                      </h4>

                      <div className="space-y-2">
                        {POLLUTANTS.map((pollutant) => {
                          const measurement = getMeasurement(
                            location,
                            pollutant,
                          );

                          return (
                            <div
                              key={pollutant}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                            >
                              <span className="text-sm font-medium text-slate-700">
                                {formatPollutant(pollutant)}
                              </span>

                              <span className="text-sm font-semibold text-slate-900">
                                {measurement
                                  ? `${formatValue(measurement.value)} ${
                                      measurement.unit
                                    }`
                                  : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
                        <p>
                          Source:{" "}
                          <span className="font-medium text-slate-700">
                            {location.source}
                          </span>
                        </p>

                        <p>
                          Data type:{" "}
                          <span className="font-medium text-slate-700">
                            Actual measurement
                          </span>
                        </p>

                        <p>
                          Latest measurement:{" "}
                          <span className="font-medium text-slate-700">
                            {formatTime(
                              location.measurements
                                .map((measurement) => measurement.measuredAt)
                                .sort()
                                .at(-1),
                            )}
                          </span>
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}
