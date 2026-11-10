"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type HistoryMeasurement,
  type Location,
} from "../../lib/api";
import { AppShell } from "../../components/common/AppShell";

const POLLUTANTS = [
  { value: "", label: "All pollutants" },
  { value: "PM2.5", label: "PM2.5" },
  { value: "PM10", label: "PM10" },
  { value: "NO2", label: "NO₂" },
  { value: "O3", label: "O₃" },
  { value: "SO2", label: "SO₂" },
  { value: "CO", label: "CO" },
] as const;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const formatLocationOption = (location: Location) => {
  const details = [
    location.city,
    location.region,
    location.country,
  ].filter(Boolean);

  return [
    location.name,
    ...details,
    location.source,
    `ID: ${location.sourceLocationId}`,
  ].join(" — ");
};

function groupMeasurementsByPollutant(
  measurements: HistoryMeasurement[],
) {
  const groups = new Map<string, HistoryMeasurement[]>();

  for (const measurement of measurements) {
    const existing = groups.get(measurement.pollutant);

    if (existing) {
      existing.push(measurement);
    } else {
      groups.set(measurement.pollutant, [measurement]);
    }
  }

  return Array.from(groups.entries()).map(([pollutant, values]) => ({
    pollutant,
    measurements: values.sort(
      (a, b) =>
        new Date(a.measuredAt).getTime() -
        new Date(b.measuredAt).getTime(),
    ),
  }));
}

export default function HistoryPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [pollutant, setPollutant] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [measurements, setMeasurements] = useState<HistoryMeasurement[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        setError("");

        const response = await api.getLocations({
          limit: 50,
        });

        setLocations(response.locations);

        if (response.locations.length > 0) {
          setLocationId(response.locations[0].id);
        }
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

  useEffect(() => {
    if (!locationId) {
      return;
    }

    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        setError("");

        const response = await api.getMeasurementHistory(locationId, {
          from: from || undefined,
          to: to || undefined,
          pollutant:
            pollutant === ""
              ? undefined
              : (pollutant as
                  | "PM2.5"
                  | "PM10"
                  | "NO2"
                  | "O3"
                  | "SO2"
                  | "CO"),
          limit: 1000,
        });

        setMeasurements(response.value);
      } catch (err) {
        setMeasurements([]);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load historical measurements.",
        );
      } finally {
        setLoadingHistory(false);
      }
    };

    void loadHistory();
  }, [locationId, pollutant, from, to]);

  const selectedLocation = locations.find(
    (location) => location.id === locationId,
  );

  const sortedMeasurements = useMemo(
    () =>
      [...measurements].sort(
        (a, b) =>
          new Date(a.measuredAt).getTime() -
          new Date(b.measuredAt).getTime(),
      ),
    [measurements],
  );

  const statistics = useMemo(() => {
    if (measurements.length === 0 || pollutant === "") {
      return null;
    }

    const unitGroups = new Map<string, HistoryMeasurement[]>();

    for (const measurement of measurements) {
      const existing = unitGroups.get(measurement.unit);

      if (existing) {
        existing.push(measurement);
      } else {
        unitGroups.set(measurement.unit, [measurement]);
      }
    }

    if (unitGroups.size !== 1) {
      return {
        minimum: null,
        maximum: null,
        average: null,
        latest: null,
        changePercent: null,
        unit: null,
        mixedUnits: true,
      };
    }

    const unitMeasurements = Array.from(unitGroups.values())[0];

    const values = unitMeasurements.map(
      (measurement) => measurement.value,
    );

    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const average =
      values.reduce((sum, value) => sum + value, 0) / values.length;

    const sortedUnitMeasurements = [...unitMeasurements].sort(
      (a, b) =>
        new Date(a.measuredAt).getTime() -
        new Date(b.measuredAt).getTime(),
    );

    const first = sortedUnitMeasurements[0]?.value;
    const latest =
      sortedUnitMeasurements[sortedUnitMeasurements.length - 1]?.value;

    const changePercent =
      first !== undefined && first !== 0 && latest !== undefined
        ? ((latest - first) / first) * 100
        : null;

    return {
      minimum,
      maximum,
      average,
      latest,
      changePercent,
      unit: unitMeasurements[0]?.unit ?? "",
      mixedUnits: false,
    };
  }, [measurements, pollutant]);

  return (
    <AppShell>
      <main style={styles.page}>
        <section style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              Historical Pollution Tracker
            </p>

            <h1 style={styles.title}>
              Air Quality History
            </h1>

            <p style={styles.subtitle}>
              Explore real historical air-quality measurements from
              monitoring stations.
            </p>
          </div>
        </section>

        <section style={styles.filters}>
          <div style={styles.field}>
            <label htmlFor="location">
              Monitoring Location
            </label>

            <select
              id="location"
              value={locationId}
              onChange={(event) =>
                setLocationId(event.target.value)
              }
              disabled={loadingLocations}
              style={styles.input}
            >
              <option value="">
                {loadingLocations
                  ? "Loading locations..."
                  : "Select a monitoring station"}
              </option>

              {locations.map((location) => (
                <option
                  key={location.id}
                  value={location.id}
                >
                  {formatLocationOption(location)}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label htmlFor="pollutant">
              Pollutant
            </label>

            <select
              id="pollutant"
              value={pollutant}
              onChange={(event) =>
                setPollutant(event.target.value)
              }
              style={styles.input}
            >
              {POLLUTANTS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label htmlFor="from">
              From
            </label>

            <input
              id="from"
              type="datetime-local"
              value={from}
              onChange={(event) =>
                setFrom(event.target.value)
              }
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="to">
              To
            </label>

            <input
              id="to"
              type="datetime-local"
              value={to}
              onChange={(event) =>
                setTo(event.target.value)
              }
              style={styles.input}
            />
          </div>
        </section>

        {selectedLocation && (
          <section style={styles.locationCard}>
            <div>
              <p style={styles.cardLabel}>
                Selected station
              </p>

              <h2 style={styles.locationName}>
                {selectedLocation.name}
              </h2>

              <p style={styles.locationMeta}>
                {[
                  selectedLocation.city,
                  selectedLocation.region,
                  selectedLocation.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>

            <div style={styles.sourceBadge}>
              {selectedLocation.source}
            </div>
          </section>
        )}

        {error && (
          <section style={styles.error}>
            <strong>
              Unable to load history
            </strong>

            <p>{error}</p>
          </section>
        )}

        {loadingHistory ? (
          <section style={styles.stateCard}>
            Loading historical measurements...
          </section>
        ) : measurements.length === 0 ? (
          <section style={styles.stateCard}>
            No historical measurements are available for
            the selected filters.
          </section>
        ) : (
          <>
            {statistics &&
              !statistics.mixedUnits && (
                <section style={styles.statsGrid}>
                  <StatCard
                    label="Latest"
                    value={`${formatNumber(
                      statistics.latest!,
                    )} ${statistics.unit}`}
                  />

                  <StatCard
                    label="Average"
                    value={`${formatNumber(
                      statistics.average!,
                    )} ${statistics.unit}`}
                  />

                  <StatCard
                    label="Minimum"
                    value={`${formatNumber(
                      statistics.minimum!,
                    )} ${statistics.unit}`}
                  />

                  <StatCard
                    label="Maximum"
                    value={`${formatNumber(
                      statistics.maximum!,
                    )} ${statistics.unit}`}
                  />

                  <StatCard
                    label="Change"
                    value={
                      statistics.changePercent === null
                        ? "—"
                        : `${
                            statistics.changePercent >= 0
                              ? "+"
                              : ""
                          }${statistics.changePercent.toFixed(
                            1,
                          )}%`
                    }
                  />
                </section>
              )}

            {statistics?.mixedUnits && (
              <section style={styles.unitWarning}>
                <strong>
                  Statistics unavailable for mixed units
                </strong>

                <p>
                  Historical measurements for this pollutant
                  use multiple units. Statistics are not combined
                  across different units.
                </p>
              </section>
            )}

            <section style={styles.card}>
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.cardLabel}>
                    Trend
                  </p>

                  <h2 style={styles.sectionTitle}>
                    Historical Measurements
                  </h2>
                </div>

                <span style={styles.measurementCount}>
                  {measurements.length} measurements
                </span>
              </div>

              {pollutant === "" ? (
                <div style={styles.chartGrid}>
                  {groupMeasurementsByPollutant(
                    measurements,
                  ).map(
                    ({
                      pollutant: pollutantName,
                      measurements:
                        pollutantMeasurements,
                    }) => (
                      <div
                        key={pollutantName}
                        style={styles.pollutantChart}
                      >
                        <div
                          style={
                            styles.pollutantChartHeader
                          }
                        >
                          <div>
                            <p
                              style={
                                styles.cardLabel
                              }
                            >
                              Pollutant
                            </p>

                            <h3
                              style={
                                styles.pollutantChartTitle
                              }
                            >
                              {pollutantName}
                            </h3>
                          </div>

                          <span
                            style={
                              styles.measurementCount
                            }
                          >
                            {
                              pollutantMeasurements.length
                            }{" "}
                            measurements
                          </span>
                        </div>

                        <HistoryChart
                          measurements={
                            pollutantMeasurements
                          }
                        />
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <HistoryChart
                  measurements={sortedMeasurements}
                />
              )}
            </section>

            <section style={styles.card}>
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.cardLabel}>
                    Measurements
                  </p>

                  <h2 style={styles.sectionTitle}>
                    Recorded Data
                  </h2>
                </div>
              </div>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>
                        Timestamp
                      </th>

                      <th style={styles.th}>
                        Pollutant
                      </th>

                      <th style={styles.th}>
                        Value
                      </th>

                      <th style={styles.th}>
                        Unit
                      </th>

                      <th style={styles.th}>
                        Source
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {[...sortedMeasurements]
                      .reverse()
                      .map((measurement) => (
                        <tr key={measurement.id}>
                          <td style={styles.td}>
                            {formatDateTime(
                              measurement.measuredAt,
                            )}
                          </td>

                          <td style={styles.td}>
                            {measurement.pollutant}
                          </td>

                          <td style={styles.td}>
                            {formatNumber(
                              measurement.value,
                            )}
                          </td>

                          <td style={styles.td}>
                            {measurement.unit}
                          </td>

                          <td style={styles.td}>
                            {measurement.source}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article style={styles.statCard}>
      <p style={styles.cardLabel}>
        {label}
      </p>

      <p style={styles.statValue}>
        {value}
      </p>
    </article>
  );
}

function HistoryChart({
  measurements,
}: {
  measurements: HistoryMeasurement[];
}) {
  const width = 1000;
  const height = 360;

  const padding = {
    top: 30,
    right: 30,
    bottom: 55,
    left: 65,
  };

  const values = measurements.map(
    (measurement) => measurement.value,
  );

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const chartWidth =
    width - padding.left - padding.right;

  const chartHeight =
    height - padding.top - padding.bottom;

  const points = measurements.map(
    (measurement, index) => {
      const x =
        measurements.length === 1
          ? padding.left + chartWidth / 2
          : padding.left +
            (index /
              (measurements.length - 1)) *
              chartWidth;

      const y =
        padding.top +
        (1 -
          (measurement.value - min) /
            range) *
          chartHeight;

      return {
        x,
        y,
        measurement,
      };
    },
  );

  const path = points
    .map((point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `L ${point.x} ${point.y}`,
    )
    .join(" ");

  return (
    <div style={styles.chartWrapper}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Historical pollution measurement chart"
      >
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="currentColor"
          opacity="0.25"
        />

        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="currentColor"
          opacity="0.25"
        />

        <text
          x={15}
          y={padding.top}
          fontSize="12"
          fill="currentColor"
        >
          {formatNumber(max)}
        </text>

        <text
          x={15}
          y={height - padding.bottom}
          fontSize="12"
          fill="currentColor"
        >
          {formatNumber(min)}
        </text>

        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point) => (
          <circle
            key={point.measurement.id}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="currentColor"
          >
            <title>
              {formatDateTime(
                point.measurement.measuredAt,
              )}{" "}
              —{" "}
              {formatNumber(
                point.measurement.value,
              )}{" "}
              {point.measurement.unit}
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "40px 24px 64px",
  },

  header: {
    marginBottom: "28px",
  },

  eyebrow: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    opacity: 0.65,
  },

  title: {
    margin: "8px 0",
    fontSize: "36px",
    lineHeight: 1.1,
  },

  subtitle: {
    margin: 0,
    fontSize: "16px",
    opacity: 0.7,
  },

  filters: {
    display: "grid",
    gridTemplateColumns:
      "minmax(220px, 2fr) minmax(160px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr)",
    gap: "16px",
    padding: "20px",
    border: "1px solid rgba(128,128,128,0.25)",
    borderRadius: "16px",
    marginBottom: "20px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  input: {
    width: "100%",
    minHeight: "42px",
    padding: "0 12px",
    border: "1px solid rgba(128,128,128,0.35)",
    borderRadius: "9px",
    background: "transparent",
    color: "inherit",
    fontSize: "14px",
  },

  locationCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "20px",
    borderRadius: "16px",
    border: "1px solid rgba(128,128,128,0.25)",
    marginBottom: "20px",
  },

  cardLabel: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    opacity: 0.6,
  },

  locationName: {
    margin: "5px 0",
    fontSize: "20px",
  },

  locationMeta: {
    margin: 0,
    opacity: 0.65,
    fontSize: "14px",
  },

  sourceBadge: {
    padding: "7px 10px",
    borderRadius: "999px",
    border: "1px solid rgba(128,128,128,0.3)",
    fontSize: "12px",
    fontWeight: 700,
  },

  error: {
    padding: "18px",
    marginBottom: "20px",
    border: "1px solid rgba(180,0,0,0.35)",
    borderRadius: "14px",
  },

  stateCard: {
    padding: "48px 24px",
    textAlign: "center",
    border: "1px dashed rgba(128,128,128,0.4)",
    borderRadius: "16px",
    opacity: 0.7,
  },

  unitWarning: {
    padding: "18px",
    marginBottom: "20px",
    border: "1px solid rgba(180,128,0,0.35)",
    borderRadius: "14px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(5, minmax(0, 1fr))",
    gap: "14px",
    marginBottom: "20px",
  },

  statCard: {
    padding: "18px",
    border: "1px solid rgba(128,128,128,0.25)",
    borderRadius: "14px",
  },

  statValue: {
    margin: "8px 0 0",
    fontSize: "26px",
    fontWeight: 700,
  },

  card: {
    border: "1px solid rgba(128,128,128,0.25)",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "20px",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "18px",
  },

  sectionTitle: {
    margin: "5px 0 0",
    fontSize: "20px",
  },

  measurementCount: {
    fontSize: "13px",
    opacity: 0.65,
  },

  chartGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "20px",
  },

  pollutantChart: {
    minWidth: 0,
    padding: "16px",
    border: "1px solid rgba(128,128,128,0.2)",
    borderRadius: "14px",
  },

  pollutantChartHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "10px",
  },

  pollutantChartTitle: {
    margin: "5px 0 0",
    fontSize: "18px",
  },

  chartWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },

  th: {
    padding: "12px",
    textAlign: "left",
    borderBottom:
      "1px solid rgba(128,128,128,0.3)",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "12px",
    borderBottom:
      "1px solid rgba(128,128,128,0.15)",
    whiteSpace: "nowrap",
  },
};