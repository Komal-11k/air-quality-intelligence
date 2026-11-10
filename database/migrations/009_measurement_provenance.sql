ALTER TABLE measurements
ADD COLUMN data_type VARCHAR(20) NOT NULL DEFAULT 'ACTUAL';

ALTER TABLE measurements
ADD CONSTRAINT measurements_data_type_check
CHECK (
    data_type IN (
        'ACTUAL',
        'ESTIMATED',
        'FORECAST'
    )
);