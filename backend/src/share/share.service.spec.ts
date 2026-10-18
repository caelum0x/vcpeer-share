import { ShareService } from "./share.service";

describe("ShareService", () => {
  let prisma: any;
  let service: ShareService;

  beforeEach(() => {
    prisma = {
      share: { update: jest.fn().mockResolvedValue({}), findUnique: jest.fn() },
      shareSecurity: {
        upsert: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
    };

    service = new ShareService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
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
