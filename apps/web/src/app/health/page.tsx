"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type HealthAdviceResponse, type Location } from "../../lib/api";
import { AppShell } from "../../components/common/AppShell";

const ACTIVITY_LABELS = {
  normal: "Normal outdoor activity",
  caution: "Use caution outdoors",
  reduce: "Reduce outdoor activity",
  avoid: "Avoid strenuous outdoor activity",
} as const;

const POLLUTANT_LABELS: Record<string, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  no2: "NO₂",
  so2: "SO₂",
  co: "CO",
  o3: "O₃",
};

const formatPollutant = (pollutant: string) =>
  POLLUTANT_LABELS[pollutant.toLowerCase()] ?? pollutant;

const formatMeasuredAt = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const getCategoryClass = (category: string) => {
    switch (category) {
      case "Good":
        return "bg-emerald-600 text-white";
  
      case "Satisfactory":
        return "bg-yellow-500 text-white";
  
      case "Moderate":
        return "bg-orange-500 text-white";
  
      case "Poor":
        return "bg-red-600 text-white";
  
      case "Very Poor":
        return "bg-purple-700 text-white";
  
      case "Severe":
        return "bg-red-900 text-white";
  
      default:
        return "bg-slate-700 text-white";
    }
  };

export default function HealthPage() {
  const [advice, setAdvice] = useState<HealthAdviceResponse | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const loadHealthByCoordinates = (
    latitude: number,
    longitude: number,
  ) => {
    setLoading(true);
    setError(null);

    void api
      .getHealthAdvice({
        latitude,
        longitude,
      })
      .then((result) => {
        setAdvice(result);
        setSelectedLocation(null);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load health advice for your location.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const loadCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by this browser.",
      );
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        loadHealthByCoordinates(
          position.coords.latitude,
          position.coords.longitude,
        );

        setLocationLoading(false);
      },
      (geoError) => {
        setLocationLoading(false);

        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            setLocationError(
              "Location permission was denied. Select a monitoring station instead.",
            );
            break;

          case geoError.POSITION_UNAVAILABLE:
            setLocationError(
              "Your current location could not be determined.",
            );
            break;

          case geoError.TIMEOUT:
            setLocationError(
              "Location request timed out. Please try again.",
            );
            break;

          default:
            setLocationError(
              "Unable to determine your current location.",
            );
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
    loadCurrentLocation();

    let cancelled = false;

    void api
      .getLocations({ limit: 100 })
      .then((result) => {
        if (!cancelled) {
          setLocations(result.locations);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLocationError(
            err instanceof Error
              ? err.message
              : "Unable to load monitoring stations.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadHealthByStation = (location: Location) => {
    setSelectedLocation(location);
    setLoading(true);
    setError(null);

    void api
      .getHealthAdvice({
        locationId: location.id,
      })
      .then((result) => {
        setAdvice(result);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load health advice for this monitoring station.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const locationLabel = useMemo(() => {
    if (!selectedLocation) {
      return "Your current location";
    }

    return [
      selectedLocation.name,
      selectedLocation.city,
      selectedLocation.region,
      selectedLocation.country,
    ]
      .filter(Boolean)
      .join(", ");
  }, [selectedLocation]);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            Health & Safety
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Air Quality Health Guidance
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Understand what the current air quality means for outdoor
            activity and what precautions may help reduce pollution
            exposure.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Monitoring location
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {locationLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={loadCurrentLocation}
              disabled={locationLoading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locationLoading
                ? "Detecting location..."
                : "Use My Current Location"}
            </button>
          </div>

          {locations.length > 0 && (
            <div className="mt-4">
              <label
                htmlFor="health-location"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Or select a monitoring station
              </label>

              <select
                id="health-location"
                value={selectedLocation?.id ?? ""}
                onChange={(event) => {
                  const location = locations.find(
                    (item) => item.id === event.target.value,
                  );

                  if (location) {
                    loadHealthByStation(location);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 sm:max-w-xl"
              >
                <option value="">
                  Select a monitoring station
                </option>

                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {[
                      location.name,
                      location.city,
                      location.region,
                      location.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {locationError && (
            <p className="mt-3 text-sm text-amber-700">
              {locationError}
            </p>
          )}
        </section>

        {loading && (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Loading health guidance...
            </p>
          </section>
        )}

        {!loading && error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-semibold text-red-900">
              Unable to load health guidance
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>
          </section>
        )}

        {!loading && !error && advice && (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <div
                className={`${getCategoryClass(
                  advice.category,
                )} rounded-2xl p-6 text-white shadow-sm`}
              >
                <p className="text-sm font-medium opacity-90">
                  Current AQI
                </p>

                <p className="mt-2 text-5xl font-bold">
                  {advice.aqi}
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {advice.category}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Dominant pollutant
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {formatPollutant(advice.dominantPollutant)}
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  This pollutant has the highest contribution to
                  the reported AQI.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Outdoor activity
                </p>

                <p className="mt-3 text-xl font-bold text-slate-900">
                  {ACTIVITY_LABELS[advice.outdoorActivity.level]}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {advice.outdoorActivity.recommendation}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                What does this mean?
              </h2>

              <p className="mt-3 leading-7 text-slate-700">
                {advice.overallMessage}
              </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">
                  General public
                </h2>

                <ul className="mt-4 space-y-3">
                  {advice.generalPublic.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="flex gap-3 text-sm leading-6 text-slate-700"
                    >
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">
                  Sensitive groups
                </h2>

                <ul className="mt-4 space-y-3">
                  {advice.sensitiveGroups.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="flex gap-3 text-sm leading-6 text-slate-700"
                    >
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Recommended precautions
              </h2>

              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {advice.precautions.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex gap-3 text-sm leading-6 text-slate-700"
                  >
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                About {formatPollutant(advice.pollutantAdvice.pollutant)}
              </h2>

              <p className="mt-3 leading-7 text-slate-700">
                {advice.pollutantAdvice.message}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-slate-500">Source</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {advice.source}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Data type</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {advice.dataType}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Measured at</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatMeasuredAt(advice.measuredAt)}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Location</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {locationLabel}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs leading-5 text-amber-900">
                {advice.disclaimer}
              </p>
            </section>
          </div>
        )}
      </main>
    </AppShell>
  );
}