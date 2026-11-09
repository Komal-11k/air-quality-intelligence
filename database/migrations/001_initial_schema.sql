CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    source VARCHAR(50) NOT NULL,
    source_location_id VARCHAR(100) NOT NULL,

    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),

    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,

    geom GEOGRAPHY(POINT, 4326) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT locations_latitude_check
        CHECK (latitude BETWEEN -90 AND 90),

    CONSTRAINT locations_longitude_check
        CHECK (longitude BETWEEN -180 AND 180),

    CONSTRAINT locations_source_unique
        UNIQUE (source, source_location_id)
);

CREATE INDEX locations_geom_idx
    ON locations
    USING GIST (geom);

CREATE INDEX locations_city_idx
    ON locations (city);


CREATE TABLE measurements (
    id BIGSERIAL,

    location_id UUID NOT NULL
        REFERENCES locations(id)
        ON DELETE CASCADE,

    measured_at TIMESTAMPTZ NOT NULL,

    pollutant VARCHAR(20) NOT NULL,

    value DOUBLE PRECISION NOT NULL,

    unit VARCHAR(20) NOT NULL,

    source VARCHAR(50) NOT NULL,

    source_measurement_id VARCHAR(150),

    raw_data JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT measurements_pollutant_check
        CHECK (
            pollutant IN (
                'PM2.5',
                'PM10',
                'NO2',
                'O3',
                'SO2',
                'CO'
            )
        )
);

SELECT create_hypertable(
    'measurements',
    by_range('measured_at'),
    if_not_exists => TRUE
);

CREATE INDEX measurements_location_time_idx
    ON measurements (location_id, measured_at DESC);

CREATE INDEX measurements_pollutant_time_idx
    ON measurements (pollutant, measured_at DESC);

CREATE INDEX measurements_source_idx
    ON measurements (source);