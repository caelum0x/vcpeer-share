import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { FileSecurityGuard } from "./fileSecurity.guard";

describe("FileSecurityGuard", () => {
  const SHARE_ID = "share-123";
  const FILE_ID = "file-456";

  let prisma: any;
  let shareService: any;
  let config: any;
  let apiKeyService: any;
  let i18n: any;
  let guard: FileSecurityGuard;

  const makeContext = (cookies: Record<string, string> = {}) => {
    const request = {
      params: { shareId: SHARE_ID, fileId: FILE_ID },
      cookies,
      headers: {},
      user: undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  };

  const baseShare = (overrides: Record<string, unknown> = {}) => ({
    id: SHARE_ID,
    creatorId: "creator-1",
    expiration: new Date(0),
    views: 0,
    reverseShare: null,
    security: null,
    userRecipients: [],
    recipients: [],
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      share: { findUnique: jest.fn() },
    };

    shareService = {
      increaseViewCount: jest.fn().mockResolvedValue(undefined),
      verifyShareToken: jest.fn(),
    };

    config = {
      get: jest.fn().mockReturnValue(false),
    };

    i18n = {
      t: jest.fn((key: string) => key),
    };

    apiKeyService = {
      authenticate: jest.fn().mockResolvedValue(null),
    };

    guard = new FileSecurityGuard(
      shareService,
      prisma,
      config,
      apiKeyService,
      i18n,
    );
    // JwtGuard.canActivate (inherited) hits passport internals we don't want
    // to bootstrap for this unit test; stub authenticateUser like the
    // public-access code path expects (anonymous visitor).
    jest.spyOn(guard as any, "authenticateUser").mockResolvedValue(undefined);
  });

  describe("public shares (no password)", () => {
    it("allows direct download with no share-token cookie at all", async () => {
      prisma.share.findUnique.mockResolvedValue(baseShare());

      await expect(guard.canActivate(makeContext({}))).resolves.toBe(true);
    });

    it("does not re-increment the view count per file (already counted once at token issuance)", async () => {
      // Regression: incrementing here on top of ShareService.getShareToken's
      // per-visit increment made maxViews count file accesses instead of
      // visits, locking a public share's own single visitor out after
      // opening just one or two files.
      prisma.share.findUnique.mockResolvedValue(
        baseShare({ security: { maxViews: 2 }, views: 1 }),
      );

      await expect(guard.canActivate(makeContext({}))).resolves.toBe(true);
      expect(shareService.increaseViewCount).not.toHaveBeenCalled();
    });

    it("allows direct download even when a stale/invalid share-token cookie is present", async () => {
      // This is the regression this guard exists to prevent: a leftover or
      // tampered `share_<id>_token` cookie must not force strict token
      // verification on a share that never required a password.
      prisma.share.findUnique.mockResolvedValue(baseShare());

      await expect(
        guard.canActivate(
          makeContext({ [`share_${SHARE_ID}_token`]: "garbage.invalid.token" }),
        ),
      ).resolves.toBe(true);
      // verifyShareToken belongs to the strict (password) path and must not
      // be consulted for a share that has no password.
      expect(shareService.verifyShareToken).not.toHaveBeenCalled();
    });

    it("still enforces maxViews for public shares regardless of cookie state", async () => {
      prisma.share.findUnique.mockResolvedValue(
        baseShare({ security: { maxViews: 1 }, views: 1 }),
      );

      await expect(
        guard.canActivate(
          makeContext({ [`share_${SHARE_ID}_token`]: "garbage.invalid.token" }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("returns 404 when the share does not exist", async () => {
      prisma.share.findUnique.mockResolvedValue(null);

      await expect(guard.canActivate(makeContext({}))).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("password-protected shares", () => {
    const pwShare = () =>
      baseShare({ security: { password: "hashed-password" } });

    it("rejects direct download with no share-token cookie", async () => {
      prisma.share.findUnique.mockResolvedValue(pwShare());

      await expect(guard.canActivate(makeContext({}))).rejects.toThrow(
        ForbiddenException,
      );
      expect(shareService.increaseViewCount).not.toHaveBeenCalled();
    });

    it("rejects an invalid/stale share-token cookie (does not fall back to public access)", async () => {
      prisma.share.findUnique.mockResolvedValue(pwShare());
      shareService.verifyShareToken.mockResolvedValue(false);

      await expect(
        guard.canActivate(
          makeContext({ [`share_${SHARE_ID}_token`]: "garbage.invalid.token" }),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(shareService.verifyShareToken).toHaveBeenCalled();
    });

    it("allows download with a valid share token", async () => {
      prisma.share.findUnique.mockResolvedValue(pwShare());
      shareService.verifyShareToken.mockResolvedValue(true);

      await expect(
        guard.canActivate(
          makeContext({ [`share_${SHARE_ID}_token`]: "valid.jwt.token" }),
        ),
      ).resolves.toBe(true);
    });
  });
});
