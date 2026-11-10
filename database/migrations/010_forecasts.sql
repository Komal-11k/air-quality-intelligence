CREATE TABLE forecasts (
    id BIGSERIAL PRIMARY KEY,

    location_id UUID NOT NULL
        REFERENCES locations(id)
        ON DELETE CASCADE,

    generated_at TIMESTAMPTZ NOT NULL,

    forecast_for TIMESTAMPTZ NOT NULL,

    pollutant VARCHAR(20) NOT NULL,

    predicted_value DOUBLE PRECISION NOT NULL,

    unit VARCHAR(20) NOT NULL,

    source VARCHAR(50) NOT NULL,

    model_version VARCHAR(100),

    prediction_lower DOUBLE PRECISION,

    prediction_upper DOUBLE PRECISION,

    raw_data JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT forecasts_pollutant_check
        CHECK (
            pollutant IN (
                'PM2.5',
                'PM10',
                'NO2',
                'O3',
                'SO2',
                'CO'
            )
        ),

    CONSTRAINT forecasts_source_check
        CHECK (
            source IN (
                'OPEN_METEO',
                'ML'
            )
        ),

    CONSTRAINT forecasts_predicted_value_finite_check
        CHECK (
            predicted_value = predicted_value
            AND predicted_value NOT IN ('Infinity'::double precision, '-Infinity'::double precision)
        ),

    CONSTRAINT forecasts_prediction_lower_finite_check
        CHECK (
            prediction_lower IS NULL
            OR (
                prediction_lower = prediction_lower
                AND prediction_lower NOT IN ('Infinity'::double precision, '-Infinity'::double precision)
            )
        ),

    CONSTRAINT forecasts_prediction_upper_finite_check
        CHECK (
            prediction_upper IS NULL
            OR (
                prediction_upper = prediction_upper
                AND prediction_upper NOT IN ('Infinity'::double precision, '-Infinity'::double precision)
            )
        ),

    CONSTRAINT forecasts_interval_order_check
        CHECK (
            prediction_lower IS NULL
            OR prediction_upper IS NULL
            OR prediction_lower <= prediction_upper
        ),

    CONSTRAINT forecasts_target_after_generation_check
        CHECK (
            forecast_for >= generated_at
        )
);

CREATE INDEX forecasts_location_time_idx
    ON forecasts (
        location_id,
        forecast_for
    );

CREATE INDEX forecasts_location_generated_idx
    ON forecasts (
        location_id,
        generated_at DESC
    );

CREATE INDEX forecasts_pollutant_time_idx
    ON forecasts (
        pollutant,
        forecast_for
    );

CREATE INDEX forecasts_source_time_idx
    ON forecasts (
        source,
        forecast_for
    );

CREATE UNIQUE INDEX forecasts_source_location_target_unique_idx
    ON forecasts (
        source,
        location_id,
        generated_at,
        forecast_for,
        pollutant
    );
