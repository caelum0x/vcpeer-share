import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Plain cookie/session JWT auth with no fallbacks at all — not the
 * `allowUnauthenticatedShares` bypass JwtGuard has, and deliberately not
 * API-key auth either (see JwtOrApiKeyGuard).
 *
 * Minting, listing, and revoking a user's own API keys must stay
 * session-only: an API key is meant to act on the same resources as a
 * logged-in browser session (shares, files), not to be able to escalate
 * itself by minting further keys. Using this guard instead of JwtGuard on
 * the API key management endpoints keeps a leaked key's blast radius
 * limited to whatever it was scoped to do.
 */
@Injectable()
export class SessionOnlyGuard extends AuthGuard("jwt") {}
