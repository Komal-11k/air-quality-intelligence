import { db } from "../../infrastructure/database/client.js";
import { gemini } from "../../infrastructure/external-apis/gemini.js";
import type {
  AssistantQuery,
  AssistantResponse,
} from "./assistant.schema.js";

const PAGE_CONTEXT: Record<string, string> = {
  "/dashboard": `
The Dashboard is the main live air-quality overview.
It can use browser geolocation to estimate air quality for the user's current coordinates.
It can also use a selected monitoring station as a fallback.
It displays AQI, AQI category, PM2.5, dominant pollutant, measurement count,
timestamp, source, and whether the data is ACTUAL or ESTIMATED.
Coordinate-based Open-Meteo data is ESTIMATED because it is modelled rather than a physical monitoring-station measurement.
`,

  "/map": `
The Map page provides an interactive geographical view of air quality.
It can show monitoring locations and spatial air-quality information.
The map is intended to help users understand how pollution varies geographically.
`,

  "/history": `
The History page shows historical pollutant measurements for air-quality locations.
Users can inspect pollutant trends over time and use historical data to understand pollution patterns.
`,

  "/compare": `
The Compare page allows users to compare multiple air-quality monitoring locations.
It compares AQI, AQI category, dominant pollutant, and available pollutant measurements.
The comparison is based on available ACTUAL monitoring-station measurements.
`,

  "/health": `
The Health & Safety page translates air-quality conditions into understandable health and outdoor-activity guidance.
It provides overall advice, guidance for the general public, sensitive groups,
outdoor activity recommendations, precautions, and pollutant-specific advice.
The information is educational and not medical diagnosis or treatment.
`,

  "/forecast": `
The Forecast page displays future air-quality values for a selected location and forecast horizon.
Forecast values must be clearly distinguished from actual measurements.
The current implementation uses a baseline methodology rather than claiming that the values are ML predictions.
`,

  "/assistant": `
The Assistant provides conversational help about the air-quality intelligence application,
its pages, air-quality concepts, and available data.
`,
};

const APPLICATION_CONTEXT = `
You are the AI assistant for a Real-Time Air Quality Intelligence Platform.

The application provides:
- Live AQI information
- Interactive air-quality maps
- Historical pollution tracking
- Location comparison
- Health and safety guidance
- AQI forecasting
- Conversational air-quality assistance

The platform distinguishes data provenance:
- ACTUAL = measurement obtained from a real monitoring station
- ESTIMATED = coordinate-based modelled air-quality data
- FORECAST = predicted future air-quality data

The application uses public air-quality data sources, including OpenAQ for monitoring-station measurements
and Open-Meteo for coordinate-based current/forecast air-quality data.

Never invent AQI values, pollutant measurements, locations, timestamps, forecasts, alerts, or application features.
If the provided context does not contain enough information to answer a question about live data,
say that the required live data is not available in the provided context.

When explaining the application or a page, use the application context and page context.
When answering general air-quality questions, explain concepts clearly and simply.
Do not provide medical diagnosis or treatment.
`;

export const answerAssistantQuestion = async (
  query: AssistantQuery,
): Promise<AssistantResponse> => {
  const sources: AssistantResponse["sources"] = [];
  const contextParts: string[] = [];

  contextParts.push(APPLICATION_CONTEXT);

  if (query.currentPage) {
    const pageContext = PAGE_CONTEXT[query.currentPage];

    if (pageContext) {
      contextParts.push(`
Current page:
${query.currentPage}

Page information:
${pageContext}
`);

      sources.push({
        type: "page",
        title: query.currentPage,
      });
    }
  }

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

      contextParts.push(`
Selected monitoring location:
${locationName}
`);

      sources.push({
        type: "location",
        title: locationName,
      });

      const measurementsResult = await db.query<{
        pollutant: string;
        value: number;
        unit: string;
        source: string;
        dataType: string;
        measuredAt: Date;
      }>(
        `
          SELECT DISTINCT ON (pollutant)
            pollutant,
            value,
            unit,
            source,
            data_type AS "dataType",
            measured_at AS "measuredAt"
          FROM measurements
          WHERE location_id = $1
          ORDER BY pollutant, measured_at DESC
        `,
        [query.locationId],
      );

      if (measurementsResult.rows.length > 0) {
        contextParts.push(`
Latest available measurements for the selected location:
${measurementsResult.rows
  .map(
    (measurement) =>
      `- ${measurement.pollutant}: ${measurement.value} ${measurement.unit}; source=${measurement.source}; dataType=${measurement.dataType}; measuredAt=${measurement.measuredAt.toISOString()}`,
  )
  .join("\n")}
`);

        sources.push({
          type: "measurements",
          title: "Latest pollutant measurements",
        });
      }
    }
  }

  if (
    query.latitude !== undefined &&
    query.longitude !== undefined
  ) {
    contextParts.push(`
User-provided coordinates:
latitude=${query.latitude}
longitude=${query.longitude}

These coordinates may be used to identify coordinate-based air-quality context.
Do not assume that coordinates alone constitute a physical monitoring-station measurement.
`);

    sources.push({
      type: "coordinates",
      title: "User coordinates",
    });
  }

  const prompt = `
${contextParts.join("\n")}

User question:
${query.question}

Answer the user's question directly.

Important rules:
- Do not invent data.
- Do not invent application functionality.
- Do not call ESTIMATED data ACTUAL.
- Do not call FORECAST data current.
- If the question asks for a live value and no live value is provided, clearly say that you cannot determine it from the available context.
- If the user asks what the current page does, explain the current page specifically.
- If the user asks about the application generally, explain the relevant application features.
- Keep the answer concise unless the user asks for detail.
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