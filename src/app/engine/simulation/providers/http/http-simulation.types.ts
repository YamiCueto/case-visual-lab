/**
 * Discrete stages of an HTTP request lifecycle in CASE Visual Lab.
 * Models the causal path from client connection to response and completion.
 */
export type HttpSimulationStage =
  | 'IDLE'
  | 'TCP_CONNECTING'
  | 'TLS_HANDSHAKE'
  | 'REQUEST_SENT'
  | 'JWT_VALIDATION'
  | 'RATE_LIMIT'
  | 'CONTROLLER'
  | 'DOMAIN'
  | 'DATABASE'
  | 'RESPONSE'
  | 'COMPLETED';

/**
 * Standard HTTP methods supported by the simulation scenario.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Configuration specification for an HTTP simulation scenario.
 * Governs the target status, latency, security credentials, and route.
 */
export interface HttpScenario {
  readonly scenarioId: string;
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly expectedStatus: number;
  readonly jwtToken?: string;
  readonly rateLimitThreshold?: number;
  readonly stageDurationsMs?: Partial<Record<HttpSimulationStage, number>>;
}

/**
 * Internal state maintained by the HttpSimulationProvider across discrete steps.
 * Invariant: Completely serializable and immutable upon snapshot capture.
 */
export interface HttpProviderState {
  readonly requestId: string;
  readonly currentStage: HttpSimulationStage;
  readonly stageTimeRemainingMs: number;
  readonly status: number | null;
  readonly accumulatedLatencyMs: number;
  readonly historyStages: readonly HttpSimulationStage[];
  readonly scenario: HttpScenario;
  readonly isCompleted: boolean;
  readonly sequenceCounter: number;
}

/**
 * Default stage durations (in milliseconds of virtual time).
 */
export const DEFAULT_STAGE_DURATIONS: Readonly<Record<HttpSimulationStage, number>> = Object.freeze(
  {
    IDLE: 0,
    TCP_CONNECTING: 50,
    TLS_HANDSHAKE: 50,
    REQUEST_SENT: 30,
    JWT_VALIDATION: 20,
    RATE_LIMIT: 20,
    CONTROLLER: 30,
    DOMAIN: 50,
    DATABASE: 70,
    RESPONSE: 40,
    COMPLETED: 0,
  },
);

/**
 * Preset canonical HTTP scenarios representing classic distributed systems behaviors.
 */
export const HTTP_SCENARIOS = Object.freeze({
  SUCCESS_200: Object.freeze<HttpScenario>({
    scenarioId: 'http-success-200',
    method: 'GET',
    url: '/api/v1/orders/101',
    headers: { Authorization: 'Bearer valid_jwt_token', Accept: 'application/json' },
    expectedStatus: 200,
  }),
  SUCCESS_201: Object.freeze<HttpScenario>({
    scenarioId: 'http-success-201',
    method: 'POST',
    url: '/api/v1/orders',
    headers: {
      Authorization: 'Bearer valid_jwt_token',
      'Content-Type': 'application/json',
    },
    body: { item: 'Enterprise License', seats: 50 },
    expectedStatus: 201,
  }),
  NO_CONTENT_204: Object.freeze<HttpScenario>({
    scenarioId: 'http-no-content-204',
    method: 'DELETE',
    url: '/api/v1/orders/101',
    headers: { Authorization: 'Bearer valid_jwt_token' },
    expectedStatus: 204,
  }),
  UNAUTHORIZED_401: Object.freeze<HttpScenario>({
    scenarioId: 'http-unauthorized-401',
    method: 'POST',
    url: '/api/v1/orders',
    headers: { Authorization: 'Bearer invalid_or_expired_jwt' },
    expectedStatus: 401,
    jwtToken: 'invalid',
  }),
  RATE_LIMIT_429: Object.freeze<HttpScenario>({
    scenarioId: 'http-rate-limit-429',
    method: 'GET',
    url: '/api/v1/orders',
    headers: { Authorization: 'Bearer valid_jwt_token' },
    expectedStatus: 429,
    rateLimitThreshold: 0, // Instant throttle trigger
  }),
  NOT_FOUND_404: Object.freeze<HttpScenario>({
    scenarioId: 'http-not-found-404',
    method: 'GET',
    url: '/api/v1/orders/999999',
    headers: { Authorization: 'Bearer valid_jwt_token' },
    expectedStatus: 404,
  }),
  SERVER_ERROR_500: Object.freeze<HttpScenario>({
    scenarioId: 'http-server-error-500',
    method: 'POST',
    url: '/api/v1/orders',
    headers: { Authorization: 'Bearer valid_jwt_token' },
    expectedStatus: 500,
  }),
});
