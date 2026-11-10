import type { Pool } from "pg";
import type { HeatmapResult } from "../heatmap/heatmap.types.js";

export class HeatmapRepository {
  constructor(private readonly pool: Pool) {}

  async saveHeatmap(result: HeatmapResult): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO spatial_heatmaps (
          pollutant,
          unit,
          generated_at,
          min_latitude,
          max_latitude,
          min_longitude,
          max_longitude,
          rows,
          columns,
          cells
        )
        VALUES (
          $1,
          $2,
          NOW(),
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9::jsonb
        )
      `,
      [
        result.pollutant,
        result.unit,
        result.bounds.minLatitude,
        result.bounds.maxLatitude,
        result.bounds.minLongitude,
        result.bounds.maxLongitude,
        result.rows,
        result.columns,
        JSON.stringify(result.cells),
      ],
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}