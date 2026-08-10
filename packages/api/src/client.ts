/**
 * API client facade — the ONLY place request signing enters client
 * packages (CLI, CI gatekeeper, dashboard). Re-exports the canonical string
 * + HMAC functions from application/auth.ts so there is exactly one
 * request-signing implementation in the repo (ADR-0011 §1).
 *
 * `signedFetch` produces the canonical `x-zk-*` headers using that
 * implementation and returns the parsed response; problem+json bodies are
 * surfaced typed, never swallowed.
 */

import { canonicalString, hmacSha256Hex, type RequestLike } from './application/auth.js';

export interface ApiClientConfig {
  baseUrl: string;
  clientId: string;
  secret: string;
  /** Clock override for tests; defaults to Date/performance.now. */
  nowMs?: () => number;
  fetchImpl?: typeof fetch;
}

export interface ApiErrorDetail {
  type?: string;
  title?: string;
  status?: number;
  code?: string;
  detail?: string;
  instance?: string;
  requestId?: string;
  errors?: { path?: string; message?: string }[];
}

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ApiErrorDetail,
    message?: string,
  ) {
    super(message ?? problem.title ?? problem.code ?? `API error ${status}`);
    this.name = 'ApiClientError';
  }
}

/** Wire shape of a proof submission; metadata fields (curve, protocol, …) are
 * stripped BEFORE signing so the canonical body always matches what the server
 * schema accepts (additionalProperties: false). */
export function normalizeSubmission(submission: unknown): unknown {
  const s = submission as { circuitId?: unknown; proof?: unknown; publicInputs?: unknown };
  if (!s.proof || typeof s.proof !== 'object') return submission;
  const p = s.proof as Record<string, unknown>;
  const { pi_a, pi_b, pi_c } = p;
  if (!Array.isArray(pi_a) || !Array.isArray(p.pi_b) || !Array.isArray(pi_c)) return submission;
  return { circuitId: s.circuitId, proof: { pi_a, pi_b, pi_c }, publicInputs: s.publicInputs };
}

/** Sign and issue a request; returns parsed JSON or throws ApiClientError. */
export async function signedFetch(
  cfg: ApiClientConfig,
  method: 'GET' | 'POST',
  path: string,
  opts: { query?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<unknown> {
  const nowMs = cfg.nowMs ?? Date.now;
  const nonce = `${nowMs()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  const timestamp = new Date(nowMs()).toISOString();

  const authHeaders: RequestLike['headers'] = {
    'x-zk-key': cfg.clientId,
    'x-zk-nonce': nonce,
    'x-zk-timestamp': timestamp,
  };

  const canonical = canonicalString({
    method,
    path,
    query: opts.query ?? '',
    headers: { ...authHeaders, ...(opts.headers ?? {}) },
    bodyJson: opts.body ?? null,
  });

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...opts.headers,
    'x-zk-key': cfg.clientId,
    'x-zk-nonce': nonce,
    'x-zk-timestamp': timestamp,
    'x-zk-signature': hmacSha256Hex(cfg.secret, canonical),
  };

  const url = `${cfg.baseUrl.replace(/\/+$/, '')}${path}${opts.query ? `?${opts.query}` : ''}`;
  const fetchImpl = cfg.fetchImpl ?? fetch;
  const res = await fetchImpl(url, {
    method,
    headers,
    ...(opts.body !== undefined && method === 'POST' ? { body: JSON.stringify(opts.body) } : {}),
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { code: 'NON-JSON', detail: text.slice(0, 200) };
    }
  }

  if (!res.ok) {
    const problem = parsed as ApiErrorDetail | undefined;
    let reason = '';
    if (problem?.detail) reason += ` ${problem.detail}`;
    if (problem?.errors?.length) reason += ` ${problem.errors.map((e) => `${e.path ?? ''}: ${e.message ?? ''}`).join('; ')}`;
    throw new ApiClientError(res.status, problem ?? {}, `API ${res.status} ${path}${reason}`);
  }
  return parsed;
}

export class ApiClient {
  constructor(readonly cfg: ApiClientConfig) {}

  async listCircuits(): Promise<unknown> {
    return signedFetch(this.cfg, 'GET', '/v1/circuits');
  }

  async registryInfo(): Promise<unknown> {
    return signedFetch(this.cfg, 'GET', '/v1/registry');
  }

  async verifyProof(submission: unknown): Promise<unknown> {
    return signedFetch(this.cfg, 'POST', '/v1/proofs/verify', { body: normalizeSubmission(submission) });
  }

  async registerProof(submission: unknown, idempotencyKey: string): Promise<unknown> {
    return signedFetch(this.cfg, 'POST', '/v1/proofs/register', {
      body: normalizeSubmission(submission),
      headers: { 'idempotency-key': idempotencyKey },
    });
  }

  async proofStatus(circuitId: string, publicInputHash: string): Promise<unknown> {
    return signedFetch(this.cfg, 'GET', `/v1/proofs/status/${circuitId}/${publicInputHash}`);
  }

  async auditLogs(limit = 50): Promise<unknown> {
    return signedFetch(this.cfg, 'GET', `/v1/audit?limit=${limit}`);
  }

  async circuits(): Promise<unknown> {
    return signedFetch(this.cfg, 'GET', '/v1/circuits');
  }
}