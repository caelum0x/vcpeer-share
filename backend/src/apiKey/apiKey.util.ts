import { Request } from "express";

// Every API key issued by ApiKeyService starts with this prefix so it can
// be told apart from other bearer tokens (e.g. OAuth access tokens some
// clients might also stuff into the Authorization header) at a glance.
export const API_KEY_PREFIX = "vcp_";

/**
 * Pulls a VCPeer Send API key out of a request, checking the standard
 * `Authorization: Bearer <token>` header first and falling back to the
 * simpler `x-api-key: <token>` header some HTTP clients/tools prefer.
 * Returns null if neither header carries something that looks like one of
 * our keys, so callers can cheaply skip API-key auth entirely for the vast
 * majority of requests (which authenticate via the session cookie).
 */
export const extractApiKeyToken = (request: Request): string | null => {
  const authHeader = request.headers["authorization"];
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const candidate = authHeader.slice("Bearer ".length).trim();
    if (candidate.startsWith(API_KEY_PREFIX)) return candidate;
  }

  const apiKeyHeader = request.headers["x-api-key"];
  if (
    typeof apiKeyHeader === "string" &&
    apiKeyHeader.startsWith(API_KEY_PREFIX)
  ) {
    return apiKeyHeader;
  }

  return null;
};
