export type HttpRequestFlowStage =
  | 'IDLE'
  | 'DNS_START'
  | 'DNS_RESOLVER_QUERY'
  | 'DNS_AUTHORITATIVE_RESPONSE'
  | 'DNS_END'
  | 'TCP_SYN'
  | 'TCP_SYN_ACK'
  | 'TCP_ACK'
  | 'TLS_CLIENT_HELLO'
  | 'TLS_SERVER_HELLO'
  | 'HTTP_REQUEST_SENT'
  | 'PROXY_FORWARD'
  | 'LOAD_BALANCER_ROUTE'
  | 'GATEWAY_DISPATCH'
  | 'MICROSERVICE_DISPATCH'
  | 'BUSINESS_LOGIC_EXECUTE'
  | 'DATABASE_QUERY'
  | 'WAL_WRITE'
  | 'DATABASE_RESPONSE'
  | 'HTTP_RESPONSE_SENT'
  | 'RESPONSE_RECEIVED'
  | 'FINISHED';

export interface HttpRequestFlowScenario {
  readonly scenarioId: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly url: string;
  readonly domain: string;
  readonly path: string;
  readonly resolvedIp: string;
  readonly status: number;
  readonly stageDurationsMs?: Readonly<Partial<Record<HttpRequestFlowStage, number>>>;
}

export interface HttpRequestFlowProviderState {
  readonly requestId: string;
  readonly currentStage: HttpRequestFlowStage;
  readonly stageTimeRemainingMs: number;
  readonly status: number | null;
  readonly accumulatedLatencyMs: number;
  readonly historyStages: readonly HttpRequestFlowStage[];
  readonly scenario: HttpRequestFlowScenario;
  readonly isCompleted: boolean;
  readonly sequenceCounter: number;
}
