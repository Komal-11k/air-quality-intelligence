CREATE TABLE spatial_heatmaps (
    id BIGSERIAL PRIMARY KEY,
    pollutant VARCHAR(20) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    min_latitude DOUBLE PRECISION NOT NULL,
    max_latitude DOUBLE PRECISION NOT NULL,
    min_longitude DOUBLE PRECISION NOT NULL,
    max_longitude DOUBLE PRECISION NOT NULL,

    rows INTEGER NOT NULL,
    columns INTEGER NOT NULL,

    cells JSONB NOT NULL,

    CONSTRAINT spatial_heatmaps_pollutant_check
        CHECK (pollutant IN ('PM2.5','PM10','NO2','O3','SO2','CO')),

    CONSTRAINT spatial_heatmaps_rows_check
        CHECK (rows >= 2 AND rows <= 200),

    CONSTRAINT spatial_heatmaps_columns_check
        CHECK (columns >= 2 AND columns <= 200),

    CONSTRAINT spatial_heatmaps_cells_array_check
        CHECK (jsonb_typeof(cells) = 'array'),

    CONSTRAINT spatial_heatmaps_latitude_check
        CHECK (
            min_latitude >= -90
            AND max_latitude <= 90
            AND min_latitude < max_latitude
        ),

    CONSTRAINT spatial_heatmaps_longitude_check
        CHECK (
            min_longitude >= -180
            AND max_longitude <= 180
            AND min_longitude < max_longitude
        )
);

CREATE INDEX spatial_heatmaps_pollutant_generated_at_idx
    ON spatial_heatmaps (pollutant, generated_at DESC);