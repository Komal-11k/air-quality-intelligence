"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/common/AppShell";
import {
  api,
  type DashboardAqiResponse,
  type Location,
} from "@/lib/api";

const pollutantLabels: Record<string, string> = {
  "PM2.5": "PM2.5",
  pm25: "PM2.5",
  PM10: "PM10",
  NO2: "NO₂",
  SO2: "SO₂",
  CO: "CO",
  co: "CO",
  O3: "O₃",
};

const formatTimestamp = (timestamp: string) =>
  new Date(timestamp).toLocaleString();

const getDataTypeLabel = (dataType: string) => {
  switch (dataType) {
    case "ACTUAL":
      return "Actual";
    case "ESTIMATED":
      return "Estimated";
    case "FORECAST":
      return "Forecast";
    default:
      return dataType;
  }
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardAqiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationMode, setLocationMode] = useState<"gps" | "station">("gps");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const loadCurrentLocationAqi = () => {
    console.log("Use My Current Location clicked");
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser.");
      return;
    }
  
    setGpsLoading(true);
    setGpsError(null);
    console.log("Requesting browser geolocation...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log(
          "GPS success:",
          position.coords.latitude,
          position.coords.longitude,
        );
        try {
          setLoading(true);
          setError(null);
          console.log("Fetching coordinate AQI...");
          const result = await api.getCurrentAqiByCoordinates(
            position.coords.latitude,
            position.coords.longitude,
          );
          console.log("Coordinate AQI response:", result);
          setData(result);
          console.log("Setting dashboard data to:", result);
          setLocationMode("gps");
          setSelectedLocation(null);
        } catch (err) {
          setGpsError(
            err instanceof Error
              ? err.message
              : "Unable to load air quality for your location.",
          );
        } finally {
          setGpsLoading(false);
          setLoading(false);
        }
      },
      (error) => {
        console.log("GPS error:", error.code, error.message);
        setGpsLoading(false);
  
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError(
              "Location permission was denied. You can search for a monitoring station instead.",
            );
            break;
  
          case error.POSITION_UNAVAILABLE:
            setGpsError(
              "Your current location could not be determined.",
            );
            break;
  
          case error.TIMEOUT:
            setGpsError(
              "Location request timed out. Please try again.",
            );
            break;
  
          default:
            setGpsError("Unable to determine your current location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };
  
  useEffect(() => {
    void loadCurrentLocationAqi();
  }, []);
  
  useEffect(() => {
    if (!selectedLocation) {
      return;
    }
  
    let cancelled = false;
  
    const loadStationAqi = async () => {
      try {
        setLoading(true);
        setError(null);
        setLocationMode("station");
  
        const result = await api.getCurrentAqi(selectedLocation.id);
  
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load air-quality data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
  
    void loadStationAqi();
  
    return () => {
      cancelled = true;
    };
  }, [selectedLocation]);
  
  const latestTimestamp =
    data?.measurements.reduce<string | null>(
      (latest, measurement) =>
        latest === null ||
        new Date(measurement.measuredAt) > new Date(latest)
          ? measurement.measuredAt
          : latest,
      null,
    ) ?? null;

  const metrics = [
    {
      label: "Current AQI",
      value: data ? String(data.aqi) : "-",
      description: data?.category ?? "Latest available reading",
    },
    {
      label: "PM2.5",
      value:
        data?.measurements.find(
          (measurement) => measurement.pollutant === "PM2.5",
        )?.value.toString() ?? "-",
      description: "µg/m³",
    },
    {
      label: "Dominant Pollutant",
      value: data
        ? pollutantLabels[data.dominantPollutant] ??
          data.dominantPollutant
        : "-",
      description: "Highest AQI contribution",
    },
    {
      label: "Measurements",
      value: data ? String(data.measurements.length) : "-",
      description: "Pollutants currently available",
    },
  ];
  const searchLocations = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);
  
      const result = await api.getLocations({
        search: locationSearch,
        limit: 10,
        offset: 0,
      });
  
      setLocations(result.locations);
    } catch (err) {
      setLocationError(
        err instanceof Error
          ? err.message
          : "Unable to search locations.",
      );
    } finally {
      setLocationLoading(false);
    }
  };
  const selectLocation = (location: Location) => {
    setSelectedLocation(location);
    setLocations([]);
    setLocationSearch("");
  };
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
            Current air quality and pollutant conditions from the
            configured monitoring location.
          </p>
        </div>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Monitoring Location
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Use your current location for nearby air-quality estimates,
              or search for a monitoring station.
            </p>
          </div>

          <button
            type="button"
            onClick={loadCurrentLocationAqi}
            disabled={gpsLoading}
            className="mt-4 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {gpsLoading ? "Detecting location..." : "Use My Current Location"}
          </button>

          {gpsError && (
            <p className="mt-3 text-sm text-red-600">
              {gpsError}
            </p>
          )}

          <div className="mt-5 border-t border-slate-200 pt-5">
            <p className="text-sm font-medium text-slate-700">
              Or search for a monitoring station
            </p>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void searchLocations();
                  }
                }}
                placeholder="Search by location, city, region or country"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />

              <button
                type="button"
                onClick={() => void searchLocations()}
                disabled={locationLoading}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locationLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {locationError && (
            <p className="mt-3 text-sm text-red-600">
              {locationError}
            </p>
          )}

          {locations.length > 0 && (
            <div className="mt-4 space-y-2">
              {locations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => selectLocation(location)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50"
                >
                  <p className="font-medium text-slate-900">
                    {location.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {[location.city, location.region, location.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Current mode
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {locationMode === "gps"
                ? "Your Current Location"
                : selectedLocation?.name ?? "Monitoring Station"}
            </p>

            {locationMode === "gps" && data && (
              <p className="mt-1 text-xs text-slate-500">
                Air quality is estimated from coordinate-based air-quality data.
              </p>
            )}

            {locationMode === "station" && selectedLocation && (
              <p className="mt-1 text-xs text-slate-500">
                {[selectedLocation.city, selectedLocation.region, selectedLocation.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        </section>
        {loading && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Loading current air-quality data...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
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

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Current Pollutants
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Latest available measurements for the current monitoring mode.
                  </p>
                </div>

                {latestTimestamp && (
                  <p className="text-xs text-slate-500">
                    Updated {formatTimestamp(latestTimestamp)}
                  </p>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.measurements.map((measurement) => (
                  <article
                    key={measurement.pollutant}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">
                        {pollutantLabels[measurement.pollutant] ??
                          measurement.pollutant}
                      </p>

                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
                        {getDataTypeLabel(measurement.dataType)}
                      </span>
                    </div>

                    <p className="mt-3 text-2xl font-bold text-slate-950">
                      {measurement.value}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {measurement.unit}
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                      Source: {measurement.source}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Air Quality Status
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Overall AQI classification for the current
                  measurements.
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="rounded-2xl bg-slate-50 px-6 py-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    AQI
                  </p>

                  <p className="mt-1 text-5xl font-bold text-slate-950">
                    {data.aqi}
                  </p>
                </div>

                <div>
                  <p className="text-xl font-semibold text-slate-950">
                    {data.category}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Dominant pollutant:{" "}
                    {pollutantLabels[data.dominantPollutant] ??
                      data.dominantPollutant}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </AppShell>
  );
}