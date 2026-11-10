ALTER TABLE alerts
ADD COLUMN is_triggered BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX alerts_triggered_idx
    ON alerts (is_triggered);