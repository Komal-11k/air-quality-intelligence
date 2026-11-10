export interface OpenAQDatetime {
    utc: string;
    local: string;
  }
  
  export interface OpenAQCoordinates {
    latitude: number | null;
    longitude: number | null;
  }
  
  export interface OpenAQParameter {
    id: number;
    name: string;
    units: string;
    displayName: string | null;
  }
  
  export interface OpenAQPeriod {
    label: string;
    interval: string;
    datetimeFrom: OpenAQDatetime | null;
    datetimeTo: OpenAQDatetime | null;
  }
  
  export interface OpenAQMeasurement {
    value: number | null;
    flagInfo: {
      hasFlags: boolean;
    };
    parameter: OpenAQParameter;
    period: OpenAQPeriod | null;
    coordinates: OpenAQCoordinates | null;
    summary: null;
    coverage: {
      expectedCount: number;
      expectedInterval: string;
      observedCount: number;
      observedInterval: string;
      percentComplete: number;
      percentCoverage: number;
      datetimeFrom: OpenAQDatetime | null;
      datetimeTo: OpenAQDatetime | null;
    } | null;
  }
  
  export interface OpenAQMeasurementsResponse {
    meta: {
      name: string;
      website: string;
      page: number;
      limit: number;
      found: number | string | null;
    };
    results: OpenAQMeasurement[];
  }
  
  export interface OpenAQLocation {
    id: number;
    name: string | null;
    locality: string | null;
    timezone: string;
    country: {
      id: number | null;
      code: string;
      name: string;
    };
    coordinates: OpenAQCoordinates;
  }
  
  export interface OpenAQSensor {
    id: number;
    name: string;
    parameter: OpenAQParameter;
    datetimeFirst: OpenAQDatetime | null;
    datetimeLast: OpenAQDatetime | null;
    coverage: {
      expectedCount: number;
      expectedInterval: string;
      observedCount: number;
      observedInterval: string;
      percentComplete: number;
      percentCoverage: number;
      datetimeFrom: OpenAQDatetime | null;
      datetimeTo: OpenAQDatetime | null;
    } | null;
    latest: {
      datetime: OpenAQDatetime;
      value: number | null;
      coordinates: OpenAQCoordinates | null;
    } | null;
  }
  
  export interface OpenAQSensorResponse {
    meta: {
      name: string;
      website: string;
      page: number;
      limit: number;
      found: number | string | null;
    };
    results: OpenAQSensor[];
  }
  
  export interface OpenAQLatestMeasurement {
    datetime: OpenAQDatetime;
    value: number | null;
    coordinates: OpenAQCoordinates;
    sensorsId: number;
    locationsId: number;
  }
  
  export interface OpenAQLatestResponse {
    meta: {
      name: string;
      website: string;
      page: number;
      limit: number;
      found: number | string | null;
    };
    results: OpenAQLatestMeasurement[];
  }

  export interface OpenAQParametersResponse {
    meta: {
      name: string;
      website: string;
      page: number;
      limit: number;
      found: number | string | null;
    };
    results: OpenAQParameter[];
  }
  
  export interface OpenAQParameterLatestResponse {
    meta: {
      name: string;
      website: string;
      page: number;
      limit: number;
      found: number | string | null;
    };
    results: OpenAQLatestMeasurement[];
  }