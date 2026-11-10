import type {
    IDWOptions,
    IDWResult,
    SpatialStation,
  } from "./idw.types.js";
  
  const EARTH_RADIUS_KM = 6371.0088;
  const DEFAULT_POWER = 2;
  const DEFAULT_MAX_DISTANCE_KM = 100;
  const DEFAULT_MIN_STATIONS = 1;
  const EXACT_DISTANCE_EPSILON_KM = 1e-9;
  
  const toRadians = (degrees: number): number =>
    (degrees * Math.PI) / 180;
  
  const validateCoordinate = (
    latitude: number,
    longitude: number,
  ): void => {
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new Error("Invalid target latitude");
    }
  
    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error("Invalid target longitude");
    }
  };
  
  const validateOptions = (options: Required<IDWOptions>): void => {
    if (!Number.isFinite(options.power) || options.power <= 0) {
      throw new Error("IDW power must be greater than 0");
    }
  
    if (
      !Number.isFinite(options.maxDistanceKm) ||
      options.maxDistanceKm <= 0
    ) {
      throw new Error("Maximum distance must be greater than 0");
    }
  
    if (
      !Number.isInteger(options.minStations) ||
      options.minStations < 1
    ) {
      throw new Error("Minimum stations must be at least 1");
    }
  };
  
  const haversineDistanceKm = (
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number,
  ): number => {
    const lat1 = toRadians(latitude1);
    const lat2 = toRadians(latitude2);
    const deltaLat = lat2 - lat1;
    const deltaLon = toRadians(longitude2 - longitude1);
  
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) ** 2;
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return EARTH_RADIUS_KM * c;
  };
  
  export class IDWService {
    interpolate(
      latitude: number,
      longitude: number,
      stations: SpatialStation[],
      options: IDWOptions = {},
    ): IDWResult {
      validateCoordinate(latitude, longitude);
  
      const resolvedOptions: Required<IDWOptions> = {
        power: options.power ?? DEFAULT_POWER,
        maxDistanceKm:
          options.maxDistanceKm ?? DEFAULT_MAX_DISTANCE_KM,
        minStations: options.minStations ?? DEFAULT_MIN_STATIONS,
      };
  
      validateOptions(resolvedOptions);
  
      if (stations.length === 0) {
        throw new Error("At least one station is required");
      }
  
      const candidates = stations
        .filter(
          (station) =>
            Number.isFinite(station.latitude) &&
            Number.isFinite(station.longitude) &&
            Number.isFinite(station.value),
        )
        .map((station) => ({
          station,
          distanceKm: haversineDistanceKm(
            latitude,
            longitude,
            station.latitude,
            station.longitude,
          ),
        }))
        .filter(
          ({ distanceKm }) =>
            distanceKm <= resolvedOptions.maxDistanceKm,
        );
  
      if (candidates.length < resolvedOptions.minStations) {
        throw new Error(
          `Insufficient stations within ${resolvedOptions.maxDistanceKm} km`,
        );
      }
  
      const exactStation = candidates.find(
        ({ distanceKm }) =>
          distanceKm <= EXACT_DISTANCE_EPSILON_KM,
      );
  
      if (exactStation) {
        return {
          value: exactStation.station.value,
          stationsUsed: 1,
          nearestDistanceKm: 0,
        };
      }
  
      let weightedValue = 0;
      let totalWeight = 0;
      let nearestDistanceKm = Number.POSITIVE_INFINITY;
  
      for (const candidate of candidates) {
        const weight =
          1 / candidate.distanceKm ** resolvedOptions.power;
  
        weightedValue += candidate.station.value * weight;
        totalWeight += weight;
  
        nearestDistanceKm = Math.min(
          nearestDistanceKm,
          candidate.distanceKm,
        );
      }
  
      if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
        throw new Error("Unable to calculate IDW interpolation");
      }
  
      const value = weightedValue / totalWeight;
  
      if (!Number.isFinite(value)) {
        throw new Error("IDW interpolation produced an invalid value");
      }
  
      return {
        value,
        stationsUsed: candidates.length,
        nearestDistanceKm,
      };
    }
  }