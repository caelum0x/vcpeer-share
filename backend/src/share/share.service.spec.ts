import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ShareService } from "./share.service";

describe("ShareService", () => {
  let prisma: any;
  let service: ShareService;
  let config: any;
  let jwtService: any;

  beforeEach(() => {
    prisma = {
      share: {
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      shareSecurity: {
        upsert: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    config = { get: jest.fn().mockReturnValue("test-jwt-secret") };
    jwtService = { sign: jest.fn().mockReturnValue("signed-token") };

    service = new ShareService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      config,
      jwtService,
      {} as any,
      {} as any,
      {} as any,
      { t: jest.fn((key: string) => key) } as any,
    );
  });

  describe("update() -> updateSecurity()", () => {
    const baseShare = { id: "share-1", creatorId: "user-1" };

    const stubFinalFind = (security: Record<string, unknown> | null) =>
      prisma.share.findUnique.mockResolvedValue({
        ...baseShare,
        security,
        recipients: [],
        files: [],
      });

    it("opts a plain link share into download notifications without deleting its security row", async () => {
      stubFinalFind({ notifyOnDownload: true });

      await service.update(
        "share-1",
        { security: { notifyOnDownload: true } } as any,
        { id: "user-1" } as any,
        { ...baseShare, security: undefined } as any,
      );

      expect(prisma.shareSecurity.delete).not.toHaveBeenCalled();
      expect(prisma.shareSecurity.upsert).toHaveBeenCalledWith({
        where: { shareId: "share-1" },
        create: {
          share: { connect: { id: "share-1" } },
          password: undefined,
          maxViews: undefined,
          notifyOnDownload: true,
        },
        update: {
          password: undefined,
          maxViews: undefined,
          notifyOnDownload: true,
        },
      });
    });

    it("deletes the security row once password, maxViews, and notifyOnDownload are all cleared", async () => {
      stubFinalFind(null);

      await service.update(
        "share-1",
        { security: { notifyOnDownload: false } } as any,
        { id: "user-1" } as any,
        {
          ...baseShare,
          security: { notifyOnDownload: true, password: null, maxViews: null },
        } as any,
      );

      expect(prisma.shareSecurity.delete).toHaveBeenCalledWith({
        where: { shareId: "share-1" },
      });
      expect(prisma.shareSecurity.upsert).not.toHaveBeenCalled();
    });

    it("carries the existing notifyOnDownload preference through an unrelated password change", async () => {
      stubFinalFind({ notifyOnDownload: true, password: "hash" });

      await service.update(
        "share-1",
        { security: { password: "new-password" } } as any,
        { id: "user-1" } as any,
        {
          ...baseShare,
          security: { notifyOnDownload: true, password: "old-hash", maxViews: null },
        } as any,
      );

      expect(prisma.shareSecurity.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ notifyOnDownload: true }),
        }),
      );
    });
  });

  describe("get()", () => {
    it("throws a clean NotFoundException (not a TypeError) when the share doesn't exist", async () => {
      // Regression: `get()` read `share.removedReason` before checking
      // `!share`, so a missing/never-existed share ID crashed with
      // "Cannot read properties of null" (an unhandled 500) instead of the
      // intended 404 "share.notFound" response.
      prisma.share.findUnique.mockResolvedValue(null);

      await expect(service.get("does-not-exist")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("getShareToken() -> consumeView()", () => {
    const shareWithMaxViews = (views: number, maxViews: number) => ({
      id: "share-1",
      createdAt: new Date(),
      expiration: new Date(0),
      security: { maxViews, password: null },
      views,
    });

    it("atomically checks-and-increments views in a single conditional UPDATE instead of read-then-write", async () => {
      // Regression: the old code checked `maxViews <= share.views` using
      // the in-memory `share` object, then issued a separate `update` for
      // `views + 1`. Two concurrent requests for the same maxViews=1 share
      // both read views=0, both passed the check, and both incremented --
      // letting more visitors in than maxViews allowed. The fix folds the
      // check into the UPDATE's WHERE clause so only one request can ever
      // win the write for a given view slot.
      prisma.share.findFirst.mockResolvedValue(shareWithMaxViews(0, 1));
      prisma.share.updateMany.mockResolvedValue({ count: 1 });

      await service.getShareToken("share-1", undefined);

      expect(prisma.share.updateMany).toHaveBeenCalledWith({
        where: { id: "share-1", views: { lt: 1 } },
        data: { views: { increment: 1 } },
      });
      expect(prisma.share.update).not.toHaveBeenCalled();
    });

    it("rejects the request once the atomic increment reports no row matched (limit already hit)", async () => {
      prisma.share.findFirst.mockResolvedValue(shareWithMaxViews(1, 1));
      // Simulates losing the race: another request's UPDATE already moved
      // views to 1, so this request's conditional WHERE matches zero rows.
      prisma.share.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.getShareToken("share-1", undefined),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it("falls back to a plain unconditional increment when the share has no maxViews set", async () => {
      prisma.share.findFirst.mockResolvedValue(
        shareWithMaxViews(5, undefined as unknown as number),
      );

      await service.getShareToken("share-1", undefined);

      expect(prisma.share.updateMany).not.toHaveBeenCalled();
      expect(prisma.share.update).toHaveBeenCalledWith({
        where: { id: "share-1" },
        data: { views: { increment: 1 } },
      });
    });
  });

  describe("transformShare()", () => {
    it("exposes notifyOnDownload as a plain boolean", () => {
      const transform = (service as any).transformShare.bind(service);

      expect(transform({ security: { notifyOnDownload: true } }).security).toEqual(
        expect.objectContaining({ notifyOnDownload: true }),
      );
      expect(
        transform({ security: { notifyOnDownload: false } }).security,
      ).toEqual(expect.objectContaining({ notifyOnDownload: false }));
      expect(transform({ security: null }).security).toEqual(
        expect.objectContaining({ notifyOnDownload: false }),
      );
    });
  });
});
