# 🌍 Real-Time Air Quality Intelligence Platform
🚀 Live Demo

https://air-quality-intelligence-ivory.vercel.app/

A production-oriented full-stack air quality intelligence platform that combines real-world air quality measurements, coordinate-based air quality data, historical analysis, forecasting, spatial visualization, health insights, and AI assistance into a single application.

The platform integrates public air-quality APIs, persists normalized data in TimescaleDB/PostgreSQL, provides a Fastify REST API, and delivers an interactive Next.js dashboard.

---

## ✨ Features

### 📊 Live AQI Dashboard

- Real-time AQI for a user's current location
- Browser geolocation support
- PM2.5
- PM10
- NO₂
- SO₂
- CO
- O₃
- AQI severity classification
- Dominant pollutant detection
- Measurement timestamp
- Data-source and provenance information
- Clear distinction between actual and estimated measurements

### 🗺️ Interactive Air Quality Map

- Worldwide air-quality monitoring stations
- Interactive station visualization
- Pollutant-based filtering
- Latest available measurements
- Spatial heatmap support
- IDW-based spatial interpolation
- Station-level measurement metadata

### 📈 Historical Pollution Tracker

- Historical pollutant measurements
- Time-series analysis
- Pollutant-specific historical data
- Measurement timestamps
- Source-aware historical records

### ⚖️ Location Comparison

Compare air-quality conditions between multiple locations using:

- AQI
- Pollutant concentrations
- Measurement timestamps
- Location metadata

### ❤️ Health & Safety

Provides understandable health guidance based on air-quality severity, including:

- AQI severity
- Health-risk interpretation
- Recommended precautions
- Outdoor activity guidance
- Vulnerable-group considerations

### 🔮 AQI Forecast

- Hourly forecast data
- Pollutant forecasts
- Forecast timestamps
- Explicit `FORECAST` provenance
- Baseline forecast support

> The current baseline forecast is explicitly distinguished from a machine-learning prediction and should not be interpreted as an ML forecast.

### 🤖 AI AQI Assistant

An AI-powered assistant that can answer questions about air quality and provide contextual guidance using the platform's air-quality data.

The backend integrates Google's Gemini API through a dedicated assistant module.

### 🧠 Spatial Intelligence

The spatial subsystem supports:

- Latest station retrieval
- Spatial station queries
- IDW interpolation
- Heatmap generation
- Worldwide station data
- Spatial persistence

---

# 🏗️ Architecture

```text
                         ┌─────────────────────────┐
                         │        User / Browser    │
                         └────────────┬────────────┘
                                      │
                                      │ Geolocation
                                      ▼
                         ┌─────────────────────────┐
                         │       Next.js Web App    │
                         │        Dashboard         │
                         └────────────┬────────────┘
                                      │
                                      │ REST API
                                      ▼
                         ┌─────────────────────────┐
                         │      Fastify API        │
                         │                         │
                         │ AQI                     │
                         │ Locations               │
                         │ Measurements            │
                         │ History                 │
                         │ Comparison              │
                         │ Health                  │
                         │ Forecast                │
                         │ Spatial                 │
                         │ Alerts                  │
                         │ Assistant               │
                         └───────┬─────────┬───────┘
                                 │         │
                    ┌────────────┘         └──────────────┐
                    ▼                                       ▼
          ┌─────────────────┐                     ┌─────────────────┐
          │   TimescaleDB   │                     │      Redis      │
          │   PostgreSQL    │                     │                 │
          │                 │                     │ Caching /       │
          │ Measurements    │                     │ Infrastructure  │
          │ Locations       │                     └─────────────────┘
          │ Forecasts       │
          │ Spatial Data    │
          └────────┬────────┘
                   │
                   │
          ┌────────┴───────────┐
          │                    │
          ▼                    ▼
 ┌─────────────────┐  ┌────────────────────┐
 │     OpenAQ      │  │    Open-Meteo      │
 │                 │  │                    │
 │ Actual station  │  │ Coordinate-based   │
 │ measurements    │  │ current + forecast │
 └─────────────────┘  └────────────────────┘
```

---

# 🔌 Data Sources

## OpenAQ

OpenAQ is the primary source for real-world monitoring-station measurements.

These measurements represent observations collected from physical monitoring stations.

They are stored with:

```text
data_type = ACTUAL
source = OPENAQ
```

The ingestion system supports worldwide OpenAQ station data rather than restricting ingestion to a single geographic region.

### Supported pollutants

- PM2.5
- PM10
- NO₂
- O₃
- SO₂
- CO

---

## Open-Meteo Air Quality

Open-Meteo provides coordinate-based air-quality information and forecasts.

Current coordinate-based values are explicitly classified as:

```text
data_type = ESTIMATED
```

Forecast values are classified as:

```text
data_type = FORECAST
```

This distinction prevents modelled/coordinate-based data from being incorrectly presented as physical sensor observations.

---

# 🧭 Data Provenance

The platform explicitly tracks the origin and nature of air-quality data.

| Data Type | Source | Meaning |
|---|---|---|
| `ACTUAL` | OpenAQ | Measurement from a monitoring station |
| `ESTIMATED` | Open-Meteo | Coordinate-based modelled/current value |
| `FORECAST` | Open-Meteo | Forecasted air-quality value |
| `FORECAST` | ML subsystem | Future prediction when ML prediction is enabled |

This provenance is surfaced throughout the application wherever applicable.

---

# 📍 Current Location Flow

The live dashboard follows this flow:

```text
User opens application
        ↓
Browser requests location permission
        ↓
Latitude + longitude obtained
        ↓
Backend receives coordinates
        ↓
Coordinate-based air-quality service
        ↓
AQI calculation
        ↓
Pollutant concentrations
        ↓
Health interpretation
        ↓
Dashboard
```

The application does **not require the user to manually select a city** to obtain coordinate-based current air quality.

---

# 🧮 AQI Calculation

The backend contains a dedicated AQI module.

The AQI pipeline:

```text
Pollutant concentration
        ↓
Validation
        ↓
Pollutant-specific breakpoint
        ↓
AQI interpolation
        ↓
Pollutant AQI
        ↓
Maximum pollutant AQI
        ↓
Overall AQI
```

The platform currently implements the required AQI calculation and severity classification using the configured CPCB-style pollutant breakpoints.

Invalid values such as:

- negative concentrations
- non-finite values
- invalid pollutant values

are rejected before AQI calculation.

The resulting AQI is constrained to the valid range:

```text
0 – 500
```

---

# 🌎 Worldwide Ingestion

The ingestion worker continuously collects current OpenAQ measurements.

The production ingestion pipeline:

```text
OpenAQ API
     ↓
Pagination
     ↓
Freshness filtering
     ↓
Validation
     ↓
Normalization
     ↓
Batch location persistence
     ↓
Batch measurement persistence
     ↓
TimescaleDB
```

Worldwide ingestion is performed pollutant-by-pollutant.

The system:

- retrieves multiple pages of OpenAQ data
- filters stale measurements
- keeps the latest valid measurement per location/pollutant
- normalizes source data
- validates measurements
- upserts locations in batches
- inserts measurements in batches
- avoids duplicate measurements

Batch persistence significantly reduces database round trips compared with inserting every measurement individually.

---

# 🗄️ Database

The project uses **PostgreSQL with TimescaleDB** for time-series air-quality data.

Spatial capabilities are provided through **PostGIS**.

### Core data includes

```text
locations
measurements
forecasts
spatial data
```

Locations contain geographic coordinates and PostGIS geography data.

Measurements contain:

- location
- timestamp
- pollutant
- value
- unit
- source
- source measurement ID
- raw source data
- data type

The measurement schema also uses uniqueness constraints to prevent duplicate source measurements.

---

# 🧩 Backend Modules

The API is organized into domain-oriented modules.

```text
apps/api/src/
├── modules/
│   ├── aqi/
│   ├── locations/
│   ├── measurements/
│   ├── history/
│   ├── comparison/
│   ├── health/
│   ├── forecast/
│   ├── alerts/
│   └── assistant/
│
├── infrastructure/
│   ├── database/
│   ├── redis/
│   └── external-apis/
│
├── middleware/
├── config/
└── server.ts
```

---

# 🖥️ Frontend

The frontend is built using Next.js and is organized by application functionality.

```text
apps/web/src/
├── app/
│   ├── dashboard/
│   ├── map/
│   ├── history/
│   ├── compare/
│   ├── health/
│   ├── forecast/
│   └── assistant/
│
├── components/
│   ├── dashboard/
│   ├── map/
│   ├── charts/
│   ├── aqi/
│   └── common/
│
├── hooks/
├── lib/
└── types/
```

---

# ⚙️ Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Interactive maps
- Data visualization
- Browser Geolocation API

## Backend

- Node.js
- TypeScript
- Fastify
- REST APIs
- Zod validation

## Database

- PostgreSQL
- TimescaleDB
- PostGIS

## Caching / Infrastructure

- Redis
- ioredis

## External APIs

- OpenAQ
- Open-Meteo
- Google Gemini

## Testing

- Vitest
- TypeScript compiler

## Deployment

- Vercel
- Timescale Cloud
- Redis-compatible production infrastructure

## Development

- pnpm
- Docker
- Docker Compose

---

# 📁 Repository Structure

```text
air-quality-intelligence/
│
├── apps/
│   ├── web/
│   └── api/
│
├── workers/
│   ├── ingestion/
│   ├── spatial/
│   └── ml/
│
├── packages/
│   ├── types/
│   ├── validation/
│   └── config/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── README.md
│
├── tests/
│
├── infrastructure/
│   └── docker/
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Install:

- Node.js
- pnpm
- Docker Desktop
- Git

Recommended versions used during development:

```text
Node.js 24+
pnpm 12+
Docker
```

---

## Clone the repository

```bash
git clone <your-repository-url>
cd air-quality-intelligence
```

---

## Install dependencies

```bash
pnpm install
```

---

## Start infrastructure

The project uses Docker for local infrastructure.

Start the required services with:

```bash
docker compose up -d
```

This provides the local PostgreSQL/TimescaleDB and Redis infrastructure used by the application.

---

# 🔐 Environment Variables

Create the required environment files according to the environment configuration used by each application/worker.

Never commit secrets to GitHub.

Important variables include:

```env
DATABASE_URL=
OPENAQ_API_KEY=
REDIS_URL=
GEMINI_API_KEY=
NEXT_PUBLIC_API_BASE_URL=
```

For the ingestion worker, additional configuration includes:

```env
INGESTION_INTERVAL_MS=
OPENAQ_REQUEST_LIMIT=
OPENAQ_WORLDWIDE_MAX_AGE_HOURS=

OPENAQ_MIN_LONGITUDE=
OPENAQ_MIN_LATITUDE=
OPENAQ_MAX_LONGITUDE=
OPENAQ_MAX_LATITUDE=

OPENAQ_LOCATION_IDS=
```

Use environment variables for all credentials and deployment-specific configuration.

---

# 🛠️ Development

Run the web application and API together:

```bash
pnpm dev
```

Build all packages:

```bash
pnpm build
```

Run the test suite:

```bash
pnpm test
```

Run linting:

```bash
pnpm lint
```

Format the project:

```bash
pnpm format
```

---

# 🔄 Ingestion Worker

The ingestion worker periodically retrieves new air-quality data.

Run it with:

```bash
pnpm --filter @air-quality/ingestion start
```

The worker performs:

```text
OpenAQ
  ↓
Normalize
  ↓
Validate
  ↓
Persist locations
  ↓
Persist measurements
  ↓
Open-Meteo
  ↓
Persist estimated current data
  ↓
Persist forecasts
```

The worker also handles transient external API failures using retries and continues processing other locations when an individual location cannot be retrieved.

---

# 🔒 Reliability & Error Handling

The platform includes protection against common production failures.

### External API failures

External API requests support retry behavior for transient failures.

### Missing data

The application distinguishes between unavailable, estimated, actual, and forecast data instead of silently presenting missing data as real measurements.

### Validation

Incoming API requests and normalized external data are validated before being used.

### Database failures

Database operations use controlled error handling and transaction boundaries where appropriate.

### Duplicate measurements

Source measurement identifiers and timestamps are used to prevent duplicate persisted records.

### Configuration security

Credentials are supplied through environment variables rather than source code.

---

# 🧪 Testing

The project uses Vitest for automated tests.

The ingestion service includes tests covering:

- API data normalization
- measurement validation
- location persistence
- worldwide ingestion
- pollutant processing
- estimated data
- actual data
- forecast data
- error handling

Run:

```bash
pnpm test
```

---

# 🌐 Production

The application is deployed as separate frontend and backend services.

### Frontend

```text
Next.js → Vercel
```

### Backend

```text
Fastify API → Vercel
```

### Database

```text
Timescale Cloud
└── PostgreSQL
    ├── TimescaleDB
    └── PostGIS
```

### Cache

```text
Redis-compatible production service
```

---

# 📡 API Overview

The backend exposes domain-specific REST endpoints.

Examples include:

```text
GET  /health

POST /aqi

GET  /aqi/current

GET  /locations/:locationId/aqi

GET  /locations

GET  /measurements

GET  /history

GET  /comparison

GET  /health

GET  /forecast

GET  /spatial/stations

GET  /spatial/heatmap

POST /assistant
```

The exact request and response schemas are defined in the API implementation and validation modules.

---

# 🗺️ Spatial Intelligence

The spatial subsystem retrieves the latest valid measurements from monitoring stations and provides geographic data for visualization.

For example:

```text
GET /spatial/stations?pollutant=PM2.5
```

The response contains station coordinates and measurement information.

Spatial interpolation uses **Inverse Distance Weighting (IDW)** where appropriate.

Conceptually:

```text
Monitoring Stations
        ↓
Latest Measurements
        ↓
Geographic Coordinates
        ↓
Spatial Interpolation
        ↓
Heatmap
```

The production dataset supports worldwide station coordinates.

---

# 🧠 AI Assistant

The AI assistant is integrated through the backend rather than exposing the model API directly to the browser.

```text
User
 ↓
Next.js
 ↓
Fastify API
 ↓
Assistant Module
 ↓
Gemini API
 ↓
Response
 ↓
User
```

API credentials remain server-side.

---

# 🔮 Forecasting

The forecast subsystem supports future air-quality values and explicitly identifies them as forecast data.

The current baseline approach is intentionally distinguishable from an ML prediction.

This allows the system to provide forecast functionality without misleading users about the predictive methodology.

The repository also contains an ML subsystem for future prediction capabilities.

---

# 🛡️ Security

Security considerations include:

- Environment-based secret management
- Server-side external API credentials
- Input validation
- API error handling
- Database parameterization
- No hard-coded production credentials
- Separation between frontend and backend secrets
- Controlled external API access

**Never commit `.env` files or production credentials to GitHub.**

---

# 📌 Project Status

### Core platform

- [x] Live AQI dashboard
- [x] Browser geolocation
- [x] AQI calculation
- [x] Pollutant concentrations
- [x] Actual vs estimated vs forecast provenance
- [x] Worldwide OpenAQ ingestion
- [x] Open-Meteo integration
- [x] Historical pollution tracking
- [x] Location comparison
- [x] Health & safety
- [x] AQI forecast
- [x] Interactive air-quality map
- [x] Spatial station API
- [x] Spatial heatmap
- [x] IDW interpolation
- [x] Redis infrastructure
- [x] AI assistant
- [x] Automated ingestion tests
- [x] Production deployment

### Future enhancements

- [ ] Advanced ML air-quality prediction 
- [ ] Alert infrastructure
- [ ] Smart personalized alerts
- [ ] Pollution impact reports
- [ ] Clean-air location finder
- [ ] Anomaly detection
- [ ] AQI sharing cards
- [ ] Voice assistant
- [ ] AQI leaderboard

---

# 🎯 Design Principles

The project follows several core principles:

### 1. Real data over fabricated data

The platform uses authentic public air-quality APIs rather than generated or hard-coded measurements.

### 2. Transparent provenance

Users should be able to understand whether a value represents an actual monitoring-station observation, an estimated coordinate-based value, or a forecast.

### 3. Production-first implementation

Architecture, validation, error handling, persistence, testing, and deployment concerns are considered before implementation rather than being added as temporary patches later.

### 4. Scalable ingestion

Worldwide data ingestion uses batch database operations to avoid excessive database round trips.

### 5. Modular architecture

Domain functionality is separated into independent backend modules, workers, shared packages, and frontend features.

### 6. Secure configuration

Credentials and environment-specific configuration are kept outside the source code.

---

# 👩‍💻 Author

**Komal Pandey**

B.Tech CSE (AI & ML)  
Graphic Era Hill University, Haldwani

---

# 📄 License

This project is intended as an educational and engineering project. Add an appropriate open-source license to the repository if you intend to distribute the project publicly.
