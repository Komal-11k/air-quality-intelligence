import { OpenAQClient } from "./providers/openaq/openaq.client.js";
import { OpenMeteoClient } from "./providers/openmeteo/openmeteo.client.js";
import { env } from "./config/env.js";
import { db } from "./infrastructure/database/client.js";
import { LocationRepository } from "./persistence/location.repository.js";
import { MeasurementRepository } from "./persistence/measurement.repository.js";
import { ForecastRepository } from "./persistence/forecast.repository.js";
import { IngestionService } from "./ingestion.service.js";

const openAQClient =
  new OpenAQClient(env.OPENAQ_API_KEY);

const openMeteoClient =
  new OpenMeteoClient();

const locationRepository =
  new LocationRepository(db);

const measurementRepository =
  new MeasurementRepository(db);

const forecastRepository =
  new ForecastRepository(db);

const ingestionService =
  new IngestionService({
    openAQClient,
    openMeteoClient,
    locationRepository,
    measurementRepository,
    forecastRepository,
  });

let ingestionRunning = false;

const runIngestion = async (): Promise<void> => {
  if (ingestionRunning) {
    console.warn(
      "[ingestion] previous cycle is still running; skipping",
    );

    return;
  }

  ingestionRunning = true;

  try {
    await ingestionService.runCycle(
      env.OPENAQ_LOCATION_IDS,
    );
  } finally {
    ingestionRunning = false;
  }
};

const shutdown = async (
  signal: string,
): Promise<void> => {
  console.log(
    `[ingestion] received ${signal}; shutting down`,
  );

  await db.end();

  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

await runIngestion();

setInterval(() => {
  void runIngestion();
}, env.INGESTION_INTERVAL_MS);