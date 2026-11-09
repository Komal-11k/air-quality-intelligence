CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL
        REFERENCES locations(id)
        ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    pollutant VARCHAR(20),
    condition VARCHAR(20) NOT NULL,
    threshold DOUBLE PRECISION NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT alerts_type_check
        CHECK (type IN ('AQI_THRESHOLD', 'POLLUTANT_THRESHOLD')),

    CONSTRAINT alerts_pollutant_check
        CHECK (
            pollutant IS NULL
            OR pollutant IN (
                'PM2.5',
                'PM10',
                'NO2',
                'O3',
                'SO2',
                'CO'
            )
        ),

    CONSTRAINT alerts_condition_check
        CHECK (
            condition IN (
                'GREATER_THAN',
                'LESS_THAN',
                'EQUAL_TO'
            )
        ),

    CONSTRAINT alerts_threshold_check
        CHECK (threshold >= 0)
);

CREATE INDEX alerts_location_idx
    ON alerts (location_id);

CREATE INDEX alerts_enabled_idx
    ON alerts (enabled);