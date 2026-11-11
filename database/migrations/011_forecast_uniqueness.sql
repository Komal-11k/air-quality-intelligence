DROP INDEX IF EXISTS forecasts_source_location_target_unique_idx;

DELETE FROM forecasts AS older
USING forecasts AS newer
WHERE older.source = newer.source
  AND older.location_id = newer.location_id
  AND older.forecast_for = newer.forecast_for
  AND older.pollutant = newer.pollutant
  AND (
    older.generated_at < newer.generated_at
    OR (
      older.generated_at = newer.generated_at
      AND older.id < newer.id
    )
  );

CREATE UNIQUE INDEX forecasts_source_location_forecast_for_pollutant_unique_idx
    ON forecasts (
        source,
        location_id,
        forecast_for,
        pollutant
    );