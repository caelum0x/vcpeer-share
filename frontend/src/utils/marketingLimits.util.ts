// The numbers the public landing pages (/wetransfer-alternative,
// /smash-alternative, /swisstransfer-alternative) advertise as this
// product's real caps. These MUST match the live `deploy/config.yaml`'s
// `share.maxSize` / `share.maxExpiration` and the backend mirror of the
// same values in `backend/src/constants.ts` — ConfigService logs a warning
// at boot if the running config ever drifts away from these again (see
// ConfigService.checkMarketingClaimsConsistency). Update all three in the
// same change if the live caps are ever raised or lowered.
export const MARKETING_CLAIMED_MAX_SIZE_BYTES = 5_000_000_000; // 5 GB per transfer
export const MARKETING_CLAIMED_MAX_SIZE_LABEL = "5 GB";
export const MARKETING_CLAIMED_MAX_EXPIRATION_DAYS = 0; // 0 = unlimited / "including never"
