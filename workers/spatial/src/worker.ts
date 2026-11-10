import { db } from "./infrastructure/database/client.js";
import { IDWService } from "./idw/idw.service.js";
import { HeatmapService } from "./heatmap/heatmap.service.js";
import { HeatmapRepository } from "./persistence/heatmap.repository.js";
import { SpatialRepository } from "./persistence/spatial.repository.js";

const POLLUTANT = process.env.SPATIAL_POLLUTANT ?? "PM2.5";

const MIN_LATITUDE = Number(
  process.env.SPATIAL_MIN_LATITUDE ?? "28.4",
);

const MAX_LATITUDE = Number(
  process.env.SPATIAL_MAX_LATITUDE ?? "28.9",
);

const MIN_LONGITUDE = Number(
  process.env.SPATIAL_MIN_LONGITUDE ?? "76.9",
);

const MAX_LONGITUDE = Number(
  process.env.SPATIAL_MAX_LONGITUDE ?? "77.4",
);

const GRID_ROWS = Number(
  process.env.SPATIAL_GRID_ROWS ?? "20",
);

const GRID_COLUMNS = Number(
  process.env.SPATIAL_GRID_COLUMNS ?? "20",
);

const MAX_DISTANCE_KM = Number(
  process.env.SPATIAL_MAX_DISTANCE_KM ?? "100",
);

const MIN_STATIONS = Number(
  process.env.SPATIAL_MIN_STATIONS ?? "1",
);

const IDW_POWER = Number(
  process.env.SPATIAL_IDW_POWER ?? "2",
);

const heatmapService = new HeatmapService(new IDWService());
const repository = new SpatialRepository(db);
const heatmapRepository = new HeatmapRepository(db);

const run = async (): Promise<void> => {
  console.log(
    `[spatial] generating ${POLLUTANT} heatmap`,
  );

  const stations =
    await repository.getLatestStationMeasurements(POLLUTANT);

  if (stations.length === 0) {
    console.warn(
      `[spatial] no actual ${POLLUTANT} station measurements available`,
    );
    return;
  }

  const unit = stations[0]?.unit;

  if (!unit) {
    throw new Error(
      `No measurement unit available for ${POLLUTANT}`,
    );
  }

  const result = heatmapService.generate({
    pollutant: POLLUTANT,
    unit,
    stations,
    bounds: {
      minLatitude: MIN_LATITUDE,
      maxLatitude: MAX_LATITUDE,
      minLongitude: MIN_LONGITUDE,
      maxLongitude: MAX_LONGITUDE,
    },
    options: {
      rows: GRID_ROWS,
      columns: GRID_COLUMNS,
      idwPower: IDW_POWER,
      maxDistanceKm: MAX_DISTANCE_KM,
      minStations: MIN_STATIONS,
    },
  });

  const validCells = result.cells.filter(
    (cell) => cell.value !== null,
  );

  console.log(
    `[spatial] stations=${stations.length} cells=${result.cells.length} valid_cells=${validCells.length}`,
  );

  await heatmapRepository.saveHeatmap(result);
console.log(`[spatial] heatmap persisted`);

  console.log(
    `[spatial] heatmap generated for ${result.pollutant}`,
  );
};

const shutdown = async (signal: string): Promise<void> => {
  console.log(`[spatial] received ${signal}; shutting down`);
  await heatmapRepository.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

try {
  await run();
} catch (error) {
  console.error("[spatial] worker failed", error);
  await heatmapRepository.close();
  process.exit(1);
}