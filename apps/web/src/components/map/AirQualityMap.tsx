"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(
  new URL(
    "maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url,
  ).toString(),
);

interface HeatmapCell {
  latitude: number;
  longitude: number;
  value: number | null;
  stationsUsed: number;
  nearestDistanceKm: number | null;
}

interface HeatmapResponse {
  id: number;
  pollutant: string;
  unit: string;
  generatedAt: string;
  bounds: {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
  };
  rows: number;
  columns: number;
  cells: HeatmapCell[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const createHeatmapGeoJSON = (
    cells: HeatmapCell[],
  ): FeatureCollection<Point, HeatmapCell> => ({
  type: "FeatureCollection",
  features: cells
    .filter((cell) => cell.value !== null)
    .map((cell) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [cell.longitude, cell.latitude],
      },
      properties: cell,
    })),
});

export function AirQualityMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadHeatmap = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/spatial/heatmap?pollutant=PM2.5`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Heatmap request failed with status ${response.status}`,
          );
        }

        const data = (await response.json()) as HeatmapResponse;

        if (!cancelled) {
          setHeatmap(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load air quality heatmap.",
          );
        }
      }
    };

    void loadHeatmap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !heatmap) {
      return;
    }

    const map = new MapLibreMap({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: {
              "background-color": "#e8eef2",
            },
          },
        ],
      },
      bounds: [
        heatmap.bounds.minLongitude,
        heatmap.bounds.minLatitude,
        heatmap.bounds.maxLongitude,
        heatmap.bounds.maxLatitude,
      ],
      fitBoundsOptions: {
        padding: 40,
      },
    });

    map.addControl(new NavigationControl(), "top-right");

    map.on("load", () => {
      const sourceData = createHeatmapGeoJSON(heatmap.cells);

      map.addSource("air-quality-cells", {
        type: "geojson",
        data: sourceData,
      });

      map.addLayer({
        id: "air-quality-heatmap",
        type: "heatmap",
        source: "air-quality-cells",
        paint: {
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "value"],
            0,
            0,
            50,
            0.2,
            100,
            0.45,
            200,
            0.75,
            300,
            1,
          ],
          "heatmap-intensity": 1.2,
          "heatmap-radius": 35,
          "heatmap-opacity": 0.8,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,0,0,0)",
            0.2,
            "#2ecc71",
            0.45,
            "#f1c40f",
            0.7,
            "#e67e22",
            0.9,
            "#e74c3c",
            1,
            "#8e44ad",
          ],
        },
      });

      map.addLayer({
        id: "air-quality-points",
        type: "circle",
        source: "air-quality-cells",
        minzoom: 8,
        paint: {
          "circle-radius": 4,
          "circle-opacity": 0.75,
          "circle-color": [
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
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [heatmap]);

  if (error) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center rounded-2xl bg-slate-100 p-6 text-center">
        <div>
          <p className="font-semibold text-red-700">
            Unable to load air quality map
          </p>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[500px] overflow-hidden rounded-2xl">
      {!heatmap && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <p className="text-sm text-slate-500">
            Loading spatial air quality data...
          </p>
        </div>
      )}

      <div ref={containerRef} className="h-full min-h-[500px] w-full" />

      {heatmap && (
        <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold text-slate-900">
            {heatmap.pollutant}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {heatmap.unit} · {heatmap.rows} × {heatmap.columns} grid
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Updated {new Date(heatmap.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}


