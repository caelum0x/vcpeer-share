import { LogLevel } from "@nestjs/common";

export const CONFIG_FILE = process.env.CONFIG_FILE || "../config.yaml";

export const DATA_DIRECTORY = process.env.DATA_DIRECTORY || "./data";
export const SHARE_DIRECTORY = `${DATA_DIRECTORY}/uploads/shares`;
export const DATABASE_URL =
  process.env.DATABASE_URL ||
  "file:../data/pingvin-share.db?connection_limit=1";
export const CLAMAV_HOST =
  process.env.CLAMAV_HOST ||
  (process.env.NODE_ENV == "docker" ? "clamav" : "127.0.0.1");
export const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT) || 3310;

export const LOG_LEVEL_AVAILABLE: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];
export const LOG_LEVEL_DEFAULT: LogLevel = process.env.NODE_ENV === 'development' ? "verbose" : "log";
export const LOG_LEVEL_ENV = `${process.env.PV_LOG_LEVEL || ""}`;

// The numbers the public landing pages (/wetransfer-alternative,
// /smash-alternative, /swisstransfer-alternative) advertise as this
// product's real caps. These MUST match `deploy/config.yaml`'s
// `share.maxSize` / `share.maxExpiration` on the live box, or the
// marketing copy is lying to visitors. ConfigService.checkMarketingClaims()
// diffs the running config against these on every boot and logs a warning
// if they ever drift apart again — see frontend/src/constants/marketingLimits.ts
// for the copy-facing mirror of the same numbers.
export const MARKETING_CLAIMED_MAX_SIZE_BYTES = 5_000_000_000; // 5 GB per transfer
export const MARKETING_CLAIMED_MAX_EXPIRATION_DAYS = 0; // 0 = "choose any expiry, including never"