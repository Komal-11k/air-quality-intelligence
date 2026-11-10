CREATE INDEX alert_events_dedup_idx
    ON alert_events (alert_id, condition, triggered_at DESC);