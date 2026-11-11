CREATE TABLE alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    alert_id UUID NOT NULL
        REFERENCES alerts(id)
        ON DELETE CASCADE,

    location_id UUID NOT NULL
        REFERENCES locations(id)
        ON DELETE CASCADE,

    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    current_value DOUBLE PRECISION NOT NULL,

    threshold DOUBLE PRECISION NOT NULL,

    condition VARCHAR(20) NOT NULL,

    CONSTRAINT alert_events_condition_check
        CHECK (
            condition IN ('GREATER_THAN', 'LESS_THAN', 'EQUAL_TO')
        )
);

CREATE INDEX alert_events_alert_idx
    ON alert_events (alert_id);

CREATE INDEX alert_events_location_idx
    ON alert_events (location_id);

CREATE INDEX alert_events_triggered_at_idx
    ON alert_events (triggered_at DESC);