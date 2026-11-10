import { IDWService } from "../idw/idw.service.js";
import type {
  HeatmapBounds,
  HeatmapCell,
  HeatmapInput,
  HeatmapResult,
} from "./heatmap.types.js";

const DEFAULT_IDW_POWER = 2;
const DEFAULT_MAX_DISTANCE_KM = 100;
const DEFAULT_MIN_STATIONS = 1;

const validateBounds = (bounds: HeatmapBounds): void => {
  if (
    !Number.isFinite(bounds.minLatitude) ||
    !Number.isFinite(bounds.maxLatitude) ||
    !Number.isFinite(bounds.minLongitude) ||
    !Number.isFinite(bounds.maxLongitude)
  ) {
    throw new Error("Heatmap bounds must contain finite coordinates");
  }

  if (
    bounds.minLatitude < -90 ||
    bounds.maxLatitude > 90 ||
    bounds.minLatitude >= bounds.maxLatitude
  ) {
    throw new Error("Invalid heatmap latitude bounds");
  }

  if (
    bounds.minLongitude < -180 ||
    bounds.maxLongitude > 180 ||
    bounds.minLongitude >= bounds.maxLongitude
  ) {
    throw new Error("Invalid heatmap longitude bounds");
  }
};

const validateGridOptions = (
  rows: number,
  columns: number,
): void => {
  if (
    !Number.isInteger(rows) ||
    rows < 2 ||
    rows > 200
  ) {
    throw new Error("Heatmap rows must be an integer between 2 and 200");
  }

  if (
    !Number.isInteger(columns) ||
    columns < 2 ||
    columns > 200
  ) {
    throw new Error(
      "Heatmap columns must be an integer between 2 and 200",
    );
  }
};

export class HeatmapService {
  constructor(
    private readonly idwService: IDWService = new IDWService(),
  ) {}

  generate(input: HeatmapInput): HeatmapResult {
    validateBounds(input.bounds);

    const {
      rows,
      columns,
      idwPower = DEFAULT_IDW_POWER,
      maxDistanceKm = DEFAULT_MAX_DISTANCE_KM,
      minStations = DEFAULT_MIN_STATIONS,
    } = input.options;

    validateGridOptions(rows, columns);

    if (!input.pollutant.trim()) {
      throw new Error("Pollutant is required");
    }

    if (!input.unit.trim()) {
      throw new Error("Unit is required");
    }

    const matchingStations = input.stations.filter(
      (station) =>
        station.pollutant === input.pollutant &&
        station.unit === input.unit,
      );

    if (matchingStations.length === 0) {
      throw new Error(
        `No stations available for ${input.pollutant} in ${input.unit}`,
      );
    }

    const cells: HeatmapCell[] = [];

    for (let row = 0; row < rows; row += 1) {
      const latitude =
        input.bounds.minLatitude +
        ((input.bounds.maxLatitude - input.bounds.minLatitude) *
          row) /
          (rows - 1);

      for (let column = 0; column < columns; column += 1) {
        const longitude =
          input.bounds.minLongitude +
          ((input.bounds.maxLongitude -
            input.bounds.minLongitude) *
            column) /
            (columns - 1);

        try {
          const result = this.idwService.interpolate(
            latitude,
            longitude,
            matchingStations,
            {
              power: idwPower,
              maxDistanceKm,
              minStations,
            },
          );

          cells.push({
            latitude,
            longitude,
            value: result.value,
            stationsUsed: result.stationsUsed,
            nearestDistanceKm: result.nearestDistanceKm,
          });
        } catch {
          cells.push({
            latitude,
            longitude,
            value: null,
            stationsUsed: 0,
            nearestDistanceKm: null,
          });
        }
      }
    }

    return {
      pollutant: input.pollutant,
      unit: input.unit,
      bounds: input.bounds,
      rows,
      columns,
      cells,
    };
  }
}