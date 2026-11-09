import { db } from "../../infrastructure/database/client.js";
import { gemini } from "../../infrastructure/external-apis/gemini.js";
import type {
  AssistantQuery,
  AssistantResponse,
} from "./assistant.schema.js";

export const answerAssistantQuestion = async (
  query: AssistantQuery,
): Promise<AssistantResponse> => {
  const sources: AssistantResponse["sources"] = [];
  let context = "";

  if (query.locationId) {
    const locationResult = await db.query<{
      name: string;
      city: string | null;
      region: string | null;
      country: string | null;
    }>(
      `
        SELECT
          name,
          city,
          region,
          country
        FROM locations
        WHERE id = $1
      `,
      [query.locationId],
    );

    if (locationResult.rows.length > 0) {
      const location = locationResult.rows[0];

      const locationName = [
        location.name,
        location.city,
        location.region,
        location.country,
      ]
        .filter(Boolean)
        .join(", ");

      context += `Location: ${locationName}\n`;

      sources.push({
        type: "location",
        title: locationName,
      });

      const measurementsResult = await db.query<{
        pollutant: string;
        value: number;
        unit: string;
        measuredAt: Date;
      }>(
        `
          SELECT DISTINCT ON (pollutant)
            pollutant,
            value,
            unit,
            measured_at AS "measuredAt"
          FROM measurements
          WHERE location_id = $1
          ORDER BY pollutant, measured_at DESC
        `,
        [query.locationId],
      );

      if (measurementsResult.rows.length > 0) {
        context += "\nLatest pollutant measurements:\n";

        for (const measurement of measurementsResult.rows) {
          context += `- ${measurement.pollutant}: ${measurement.value} ${measurement.unit} at ${measurement.measuredAt.toISOString()}\n`;
        }

        sources.push({
          type: "measurements",
          title: "Latest pollutant measurements",
        });
      }
    }
  }

  const prompt = `
You are an air-quality intelligence assistant.

Answer the user's question using the provided air-quality context.

Rules:
- Be clear and concise.
- Do not invent measurements, AQI values, locations, forecasts, or alerts.
- If the provided context does not contain enough information, say so clearly.
- Explain technical air-quality concepts in simple language.
- If the user asks about a specific location, focus on that location.
- Do not claim that a value is "current" unless the context provides a recent measurement.

Air-quality context:
${context || "No location-specific air-quality data was provided."}

User question:
${query.question}
`;

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
  });

  const answer = response.text?.trim();

  if (!answer) {
    throw new Error("Gemini returned an empty response");
  }

  return {
    answer,
    sources,
  };
};