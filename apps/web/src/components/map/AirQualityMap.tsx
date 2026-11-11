"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import type {
  DataDrivenPropertyValueSpecification,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(
  new URL(
    "maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url,
  ).toString(),
);

interface Station {
  id: string;
  locationId: string;
  latitude: number;
  longitude: number;
  pollutant: string;
  value: number;
  unit: string;
  measuredAt: string;
}

interface StationsResponse {
  pollutant: string;
  stations: Station[];
}

const POLLUTANTS = [
  "PM2.5",
  "PM10",
  "NO2",
  "O3",
  "SO2",
  "CO",
] as const;

type Pollutant = (typeof POLLUTANTS)[number];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const createStationGeoJSON = (
  stations: Station[],
): FeatureCollection<Point, Station> => ({
  type: "FeatureCollection",
  features: stations.map((station) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [
        station.longitude,
        station.latitude,
      ],
    },
    properties: station,
  })),
});

const pollutantColorExpression =
  [
    "interpolate",
    ["linear"],
    ["get", "value"],
    0,
    "#2ecc71",
    50,
    "#f1c40f",
    100,
    "#e67e22",
    200,
    "#e74c3c",
    300,
    "#8e44ad",
  ] as DataDrivenPropertyValueSpecification<string>;

export function AirQualityMap() {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<MapLibreMap | null>(null);

  const [pollutant, setPollutant] =
    useState<Pollutant>("PM2.5");

  const [stations, setStations] =
    useState<StationsResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStations = async () => {
      setLoading(true);
      setError(null);
      setStations(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/spatial/stations?pollutant=${encodeURIComponent(
            pollutant,
          )}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Station request failed with status ${response.status}`,
          );
        }

        const data =
          (await response.json()) as StationsResponse;

        if (!cancelled) {
          setStations(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load air quality stations.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadStations();

    return () => {
      cancelled = true;
    };
  }, [pollutant]);

  useEffect(() => {
    if (!containerRef.current || !stations) {
      return;
    }

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    if (stations.stations.length === 0) {
      return;
    }

    const coordinates =
      stations.stations.map((station) => [
        station.longitude,
        station.latitude,
      ] as [number, number]);

    const minLongitude = Math.min(
      ...coordinates.map(
        ([longitude]) => longitude,
      ),
    );

    const maxLongitude = Math.max(
      ...coordinates.map(
        ([longitude]) => longitude,
      ),
    );

    const minLatitude = Math.min(
      ...coordinates.map(
        ([, latitude]) => latitude,
      ),
    );

    const maxLatitude = Math.max(
      ...coordinates.map(
        ([, latitude]) => latitude,
      ),
    );

    const map = new MapLibreMap({
      container: containerRef.current,
      style:
        "https://tiles.openfreemap.org/styles/liberty",
      bounds: [
        minLongitude,
        minLatitude,
        maxLongitude,
        maxLatitude,
      ],
      fitBoundsOptions: {
        padding: 80,
      },
    });

    map.addControl(
      new NavigationControl(),
      "top-right",
    );

    map.on("load", () => {
      map.addSource("air-quality-stations", {
        type: "geojson",
        data: createStationGeoJSON(
          stations.stations,
        ),
      });

      map.addLayer({
        id: "air-quality-station-circles",
        type: "circle",
        source: "air-quality-stations",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            6,
            12,
            9,
            15,
            12,
          ],
          "circle-color":
            pollutantColorExpression,
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.on(
        "click",
        "air-quality-station-circles",
        (event) => {
          const feature =
            event.features?.[0];

          if (!feature) {
            return;
          }

          const properties =
            feature.properties as unknown as Station;

          const coordinates =
            (
              feature.geometry as Point
            ).coordinates as [
              number,
              number
            ];

          new Popup()
            .setLngLat(coordinates)
            .setHTML(`
              <div style="min-width: 180px">
                <strong>${properties.pollutant}</strong>

                <div style="margin-top: 6px">
                  <strong>
                    ${properties.value} ${properties.unit}
                  </strong>
                </div>

                <div style="margin-top: 6px; font-size: 12px; color: #64748b">
                  Updated ${new Date(
                    properties.measuredAt,
                  ).toLocaleString()}
                </div>
              </div>
            `)
            .addTo(map);
        },
      );

      map.on(
        "mouseenter",
        "air-quality-station-circles",
        () => {
          map.getCanvas().style.cursor =
            "pointer";
        },
      );

      map.on(
        "mouseleave",
        "air-quality-station-circles",
        () => {
          map.getCanvas().style.cursor =
            "";
        },
      );
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [stations]);

  return (
    <div className="relative h-full min-h-[500px] overflow-hidden rounded-2xl">
      <div className="absolute left-4 top-4 z-20 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <label
          htmlFor="pollutant-select"
          className="block text-xs font-semibold text-slate-700"
        >
          Pollutant
        </label>

        <select
          id="pollutant-select"
          value={pollutant}
          onChange={(event) =>
            setPollutant(
              event.target.value as Pollutant,
            )
          }
          className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-500"
        >
          {POLLUTANTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <p className="text-sm text-slate-500">
            Loading {pollutant} stations...
          </p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 p-6 text-center">
          <div>
            <p className="font-semibold text-red-700">
              Unable to load air quality stations
            </p>

            <p className="mt-2 text-sm text-slate-600">
              {error}
            </p>
          </div>
        </div>
      )}

      {!loading &&
        !error &&
        stations &&
        stations.stations.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
            <p className="text-sm text-slate-500">
              No recent OpenAQ stations available for{" "}
              {pollutant}.
            </p>
          </div>
        )}

      <div
        ref={containerRef}
        className="h-full min-h-[500px] w-full"
      />

      {!loading && !error && stations && (
        <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold text-slate-900">
            {stations.pollutant}
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            {stations.stations.length} active OpenAQ{" "}
            {stations.stations.length === 1
              ? "station"
              : "stations"}
          </p>

          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span>Lower</span>

            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            <span>Moderate</span>

            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <span>High</span>

            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span>Very high</span>
          </div>
        </div>
      )}
    </div>
  );
}