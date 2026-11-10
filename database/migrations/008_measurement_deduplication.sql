CREATE UNIQUE INDEX measurements_source_measurement_unique_idx
ON measurements (source, source_measurement_id, measured_at)
WHERE source_measurement_id IS NOT NULL;