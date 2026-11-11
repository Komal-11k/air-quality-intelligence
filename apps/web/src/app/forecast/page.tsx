"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type ForecastPoint,
  type Location,
} from "../../lib/api";
import { AppShell } from "../../components/common/AppShell";

const HORIZONS = [
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
  { value: 72, label: "72 hours" },
];

const POLLUTANT_ORDER = [
  "PM2.5",
  "PM10",
  "NO2",
  "SO2",
  "CO",
  "O3",
];

function formatLocation(location: Location) {
  const parts = [
    location.name,
    location.city,
    location.region,
    location.country,
  ].filter(Boolean);

  return parts.join(", ");
}

function formatForecastTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatChartTime(
  timestamp: string,
  includeDate: boolean,
) {
  return new Intl.DateTimeFormat("en-IN", {
    ...(includeDate
      ? {
          day: "numeric",
          month: "short",
        }
      : {}),
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatValue(value: number) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1);
}

function formatForecastSource(source: string) {
  switch (source) {
    case "OPEN_METEO":
      return "Open-Meteo";

    case "ML":
      return "ML prediction";

    default:
      return source;
  }
}

function getForecastSources(
  forecast: ForecastPoint[],
) {
  return Array.from(
    new Set(
      forecast
        .map((item) => item.source)
        .filter(Boolean),
    ),
  );
}

function deduplicateLocations(
  locations: Location[],
) {
  const seen = new Set<string>();
  const result: Location[] = [];

  for (const location of locations) {
    if (seen.has(location.id)) {
      continue;
    }

    seen.add(location.id);
    result.push(location);
  }

  return result;
}

export default function ForecastPage() {
  const [locations, setLocations] = useState<
    Location[]
  >([]);

  const [selectedLocationId, setSelectedLocationId] =
    useState("");

  const [locationSearch, setLocationSearch] =
    useState("");

  const [hours, setHours] = useState(24);

  const [selectedPollutant, setSelectedPollutant] =
    useState("");

  const [forecast, setForecast] = useState<
    ForecastPoint[]
  >([]);

  const [loadingLocations, setLoadingLocations] =
    useState(true);

  const [loadingForecast, setLoadingForecast] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const [forecastError, setForecastError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        setLocationError("");

        const response = await api.getLocations({
          limit: 50,
          offset: 0,
        });

        if (cancelled) {
          return;
        }

        const uniqueLocations =
          deduplicateLocations(
            response.locations,
          );

        setLocations(uniqueLocations);

        if (uniqueLocations.length > 0) {
          setSelectedLocationId(
            uniqueLocations[0].id,
          );
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        setLocationError(
          err instanceof Error
            ? err.message
            : "Failed to load monitoring locations.",
        );
      } finally {
        if (!cancelled) {
          setLoadingLocations(false);
        }
      }
    };

    void loadLocations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedLocationId) {
      setForecast([]);
      return;
    }

    let cancelled = false;

    const loadForecast = async () => {
      try {
        setLoadingForecast(true);
        setForecastError("");

        const response =
          await api.getForecast({
            locationId:
              selectedLocationId,
            hours,
          });

        if (cancelled) {
          return;
        }

        setForecast(response.forecast);

        const availablePollutants =
          Array.from(
            new Set(
              response.forecast.map(
                (item) =>
                  item.pollutant,
              ),
            ),
          );

        if (
          selectedPollutant &&
          !availablePollutants.includes(
            selectedPollutant,
          )
        ) {
          setSelectedPollutant("");
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        setForecast([]);

        setForecastError(
          err instanceof Error
            ? err.message
            : "Failed to load forecast.",
        );
      } finally {
        if (!cancelled) {
          setLoadingForecast(false);
        }
      }
    };

    void loadForecast();

    return () => {
      cancelled = true;
    };
  }, [
    selectedLocationId,
    hours,
  ]);

  const filteredLocations = useMemo(() => {
    const query =
      locationSearch.trim().toLowerCase();

    if (!query) {
      return locations;
    }

    return locations.filter(
      (location) =>
        formatLocation(location)
          .toLowerCase()
          .includes(query),
    );
  }, [
    locations,
    locationSearch,
  ]);

  const selectedLocation =
    locations.find(
      (location) =>
        location.id ===
        selectedLocationId,
    );

  const availablePollutants =
    useMemo(() => {
      const pollutants =
        Array.from(
          new Set(
            forecast.map(
              (item) =>
                item.pollutant,
            ),
          ),
        );

      return pollutants.sort(
        (a, b) => {
          const aIndex =
            POLLUTANT_ORDER.indexOf(
              a,
            );

          const bIndex =
            POLLUTANT_ORDER.indexOf(
              b,
            );

          if (
            aIndex === -1 &&
            bIndex === -1
          ) {
            return a.localeCompare(
              b,
            );
          }

          if (aIndex === -1) {
            return 1;
          }

          if (bIndex === -1) {
            return -1;
          }

          return (
            aIndex - bIndex
          );
        },
      );
    }, [forecast]);

  const activePollutant =
    selectedPollutant &&
    availablePollutants.includes(
      selectedPollutant,
    )
      ? selectedPollutant
      : availablePollutants[0] ??
        "";

  const activeForecast =
    useMemo(() => {
      if (!activePollutant) {
        return [];
      }

      return forecast
        .filter(
          (item) =>
            item.pollutant ===
            activePollutant,
        )
        .sort(
          (a, b) =>
            new Date(
              a.timestamp,
            ).getTime() -
            new Date(
              b.timestamp,
            ).getTime(),
        );
    }, [
      forecast,
      activePollutant,
    ]);

  const forecastStats =
    useMemo(() => {
      if (
        activeForecast.length ===
        0
      ) {
        return null;
      }

      const values =
        activeForecast
          .map(
            (item) =>
              item.predictedValue,
          )
          .filter(
            Number.isFinite,
          );

      if (values.length === 0) {
        return null;
      }

      return {
        next: values[0],
        minimum:
          Math.min(...values),
        maximum:
          Math.max(...values),
        unit:
          activeForecast[0]
            .unit,
        points:
          activeForecast.length,
        sources:
          getForecastSources(
            activeForecast,
          ),
      };
    }, [activeForecast]);

  const chart = useMemo(() => {
    if (
      activeForecast.length ===
      0
    ) {
      return null;
    }

    const width = 1000;
    const height = 320;

    const paddingLeft = 64;
    const paddingRight = 24;
    const paddingTop = 24;
    const paddingBottom = 52;

    const values =
      activeForecast.map(
        (item) =>
          item.predictedValue,
      );

    const minValue =
      Math.min(...values);

    const maxValue =
      Math.max(...values);

    const range =
      maxValue - minValue;

    const chartMin =
      range === 0
        ? Math.max(
            0,
            minValue -
              Math.max(
                10,
                Math.abs(
                  minValue,
                ) * 0.1,
              ),
          )
        : Math.max(
            0,
            minValue -
              range * 0.1,
          );

    const chartMax =
      range === 0
        ? maxValue +
          Math.max(
            10,
            Math.abs(
              maxValue,
            ) * 0.1,
          )
        : maxValue +
          range * 0.1;

    const valueRange =
      chartMax - chartMin;

    const chartWidth =
      width -
      paddingLeft -
      paddingRight;

    const chartHeight =
      height -
      paddingTop -
      paddingBottom;

    const points =
      activeForecast.map(
        (item, index) => {
          const x =
            activeForecast.length ===
            1
              ? paddingLeft +
                chartWidth /
                  2
              : paddingLeft +
                (index /
                  (activeForecast.length -
                    1)) *
                  chartWidth;

          const y =
            paddingTop +
            ((chartMax -
              item.predictedValue) /
              valueRange) *
              chartHeight;

          return {
            ...item,
            x,
            y,
          };
        },
      );

    const path = points
      .map(
        (point, index) =>
          index === 0
            ? `M ${point.x} ${point.y}`
            : `L ${point.x} ${point.y}`,
      )
      .join(" ");

    const yTicks =
      Array.from(
        { length: 5 },
        (_, index) => {
          const value =
            chartMax -
            (index / 4) *
              (chartMax -
                chartMin);

          const y =
            paddingTop +
            (index / 4) *
              chartHeight;

          return {
            value,
            y,
          };
        },
      );

    const labelIndexes =
      Array.from(
        new Set([
          0,
          Math.floor(
            (activeForecast.length -
              1) /
              3,
          ),
          Math.floor(
            ((activeForecast.length -
              1) *
              2) /
              3,
          ),
          activeForecast.length -
            1,
        ]),
      );

    const firstTimestamp =
      activeForecast[0]
        .timestamp;

    const lastTimestamp =
      activeForecast[
        activeForecast.length -
          1
      ].timestamp;

    const firstDate =
      new Date(
        firstTimestamp,
      ).toDateString();

    const lastDate =
      new Date(
        lastTimestamp,
      ).toDateString();

    const crossesDate =
      firstDate !== lastDate;

    return {
      width,
      height,
      points,
      path,
      yTicks,
      labelIndexes,
      crossesDate,
    };
  }, [activeForecast]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <p className="text-sm font-medium text-teal-700">
            Forecast
          </p>

          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                Air Quality Forecast
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                View projected pollutant
                concentrations for the
                selected monitoring
                location.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="forecast-location-search"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Monitoring location
              </label>

              <input
                id="forecast-location-search"
                type="search"
                value={locationSearch}
                onChange={(event) =>
                  setLocationSearch(
                    event.target.value,
                  )
                }
                placeholder="Search monitoring locations..."
                disabled={
                  loadingLocations ||
                  locations.length ===
                    0
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              <select
                id="forecast-location"
                value={
                  selectedLocationId
                }
                onChange={(event) =>
                  setSelectedLocationId(
                    event.target.value,
                  )
                }
                disabled={
                  loadingLocations ||
                  filteredLocations.length ===
                    0
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {loadingLocations ? (
                  <option value="">
                    Loading
                    locations...
                  </option>
                ) : filteredLocations.length ===
                  0 ? (
                  <option value="">
                    No matching
                    locations
                  </option>
                ) : (
                  filteredLocations.map(
                    (location) => (
                      <option
                        key={
                          location.id
                        }
                        value={
                          location.id
                        }
                      >
                        {formatLocation(
                          location,
                        )}
                      </option>
                    ),
                  )
                )}
              </select>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {
                    filteredLocations.length
                  }{" "}
                  matching location
                  {filteredLocations.length ===
                  1
                    ? ""
                    : "s"}
                </span>

                {selectedLocation && (
                  <span className="truncate pl-3 text-slate-600">
                    Selected:{" "}
                    {
                      selectedLocation.name
                    }
                  </span>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="forecast-horizon"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Forecast horizon
              </label>

              <select
                id="forecast-horizon"
                value={hours}
                onChange={(event) =>
                  setHours(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                disabled={
                  loadingForecast
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {HORIZONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="forecast-pollutant"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Pollutant
              </label>

              <select
                id="forecast-pollutant"
                value={
                  activePollutant
                }
                onChange={(event) =>
                  setSelectedPollutant(
                    event.target.value,
                  )
                }
                disabled={
                  loadingForecast ||
                  availablePollutants.length ===
                    0
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {availablePollutants.length ===
                0 ? (
                  <option value="">
                    No pollutants
                    available
                  </option>
                ) : (
                  availablePollutants.map(
                    (pollutant) => (
                      <option
                        key={
                          pollutant
                        }
                        value={
                          pollutant
                        }
                      >
                        {
                          pollutant
                        }
                      </option>
                    ),
                  )
                )}
              </select>
            </div>
          </div>
        </section>

        {locationError && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Monitoring locations
              unavailable
            </p>

            <p className="mt-1 text-sm text-red-700">
              {locationError}
            </p>
          </section>
        )}

        {forecastError && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Forecast unavailable
            </p>

            <p className="mt-1 text-sm text-red-700">
              {forecastError}
            </p>
          </section>
        )}

        {loadingForecast ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex min-h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-700" />

                <p className="mt-3 text-sm text-slate-500">
                  Loading forecast...
                </p>
              </div>
            </div>
          </section>
        ) : activeForecast.length ===
          0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex min-h-48 items-center justify-center text-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  No forecast data
                  available
                </h2>

                <p className="mt-2 max-w-md text-sm text-slate-600">
                  There is currently no
                  forecast data for
                  this location and
                  pollutant.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Next forecast
                  value
                </p>

                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {forecastStats
                    ? formatValue(
                        forecastStats.next,
                      )
                    : "—"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {forecastStats?.unit ??
                    ""}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Forecast minimum
                </p>

                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {forecastStats
                    ? formatValue(
                        forecastStats.minimum,
                      )
                    : "—"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {forecastStats?.unit ??
                    ""}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Forecast maximum
                </p>

                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {forecastStats
                    ? formatValue(
                        forecastStats.maximum,
                      )
                    : "—"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {forecastStats?.unit ??
                    ""}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Forecast points
                </p>

                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {forecastStats?.points ??
                    0}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Next {hours} hours
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    {activePollutant}{" "}
                    forecast
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedLocation
                      ? formatLocation(
                          selectedLocation,
                        )
                      : "Selected monitoring location"}
                  </p>

                  {forecastStats &&
                    forecastStats.sources
                      .length >
                      0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Source:{" "}
                        {forecastStats.sources
                          .map(
                            formatForecastSource,
                          )
                          .join(
                            ", ",
                          )}
                      </p>
                    )}
                </div>

                <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800">
                  Forecast
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <svg
                  viewBox={`0 0 ${
                    chart?.width ??
                    1000
                  } ${
                    chart?.height ??
                    320
                  }`}
                  className="min-w-[700px] w-full"
                  role="img"
                  aria-label={`${activePollutant} forecast chart`}
                >
                  {chart?.yTicks.map(
                    (tick) => (
                      <g
                        key={
                          tick.y
                        }
                      >
                        <line
                          x1="64"
                          y1={
                            tick.y
                          }
                          x2="976"
                          y2={
                            tick.y
                          }
                          stroke="currentColor"
                          className="text-slate-100"
                          strokeWidth="1"
                        />

                        <text
                          x="54"
                          y={
                            tick.y +
                            4
                          }
                          textAnchor="end"
                          className="fill-slate-400 text-[11px]"
                        >
                          {formatValue(
                            tick.value,
                          )}
                        </text>
                      </g>
                    ),
                  )}

                  <line
                    x1="64"
                    y1="268"
                    x2="976"
                    y2="268"
                    stroke="currentColor"
                    className="text-slate-200"
                    strokeWidth="1"
                  />

                  {chart?.labelIndexes.map(
                    (index) => {
                      const point =
                        chart.points[
                          index
                        ];

                      return (
                        <text
                          key={`${point.timestamp}-${index}`}
                          x={
                            point.x
                          }
                          y="294"
                          textAnchor="middle"
                          className="fill-slate-500 text-[11px]"
                        >
                          {formatChartTime(
                            point.timestamp,
                            chart.crossesDate,
                          )}
                        </text>
                      );
                    },
                  )}

                  <path
                    d={
                      chart?.path ??
                      ""
                    }
                    fill="none"
                    stroke="currentColor"
                    className="text-teal-700"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {chart?.points.map(
                    (point) => (
                      <circle
                        key={`${point.timestamp}-${point.pollutant}`}
                        cx={
                          point.x
                        }
                        cy={
                          point.y
                        }
                        r="3.5"
                        fill="currentColor"
                        className="text-teal-700"
                      />
                    ),
                  )}
                </svg>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>
                  Values shown in{" "}
                  {
                    forecastStats?.unit
                  }.
                </span>

                <span>
                  •
                </span>

                <span>
                  {
                    activeForecast.length
                  }{" "}
                  hourly forecast
                  points.
                </span>

                {forecastStats &&
                  forecastStats.sources
                    .length >
                    0 && (
                    <>
                      <span>
                        •
                      </span>

                      <span>
                        Source:{" "}
                        {forecastStats.sources
                          .map(
                            formatForecastSource,
                          )
                          .join(
                            ", ",
                          )}
                      </span>
                    </>
                  )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-950">
                  Hourly forecast
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Forecast values for the
                  selected pollutant.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Time
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pollutant
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Predicted value
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Unit
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Source
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {activeForecast.map(
                      (point) => (
                        <tr
                          key={`${point.timestamp}-${point.pollutant}`}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-3 text-slate-700">
                            {formatForecastTime(
                              point.timestamp,
                            )}
                          </td>

                          <td className="px-5 py-3 font-medium text-slate-900">
                            {
                              point.pollutant
                            }
                          </td>

                          <td className="px-5 py-3 font-medium text-slate-900">
                            {formatValue(
                              point.predictedValue,
                            )}
                          </td>

                          <td className="px-5 py-3 text-slate-500">
                            {
                              point.unit
                            }
                          </td>

                          <td className="px-5 py-3 text-slate-500">
                            {formatForecastSource(
                              point.source,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs leading-5 text-blue-900">
                <span className="font-semibold">
                  Forecast methodology:
                </span>{" "}
                Forecast values are retrieved
                from the configured forecast
                provider and represent projected
                pollutant concentrations for the
                selected monitoring location.
                The current production forecast
                source is Open-Meteo. These values
                are forecasts and should not be
                interpreted as actual sensor
                measurements.
              </p>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}