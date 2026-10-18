import { FileService } from "./file.service";

describe("FileService.notifyRecipientDownload", () => {
  const SHARE_ID = "share-123";
  const FILE_NAME = "report.pdf";

  let prisma: any;
  let configService: any;
  let emailService: any;
  let cache: any;
  let service: FileService;

  // Config flags default to the "fully enabled" state for each test and are
  // overridden per-case.
  let configValues: Record<string, unknown>;

  beforeEach(() => {
    configValues = {
      "smtp.enabled": true,
      "share.enableShareDownloadNotifications": true,
      "share.enableShareEmailRecipients": true,
    };

    configService = {
      get: jest.fn((key: string) => configValues[key]),
    };

    prisma = {
      share: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    emailService = {
      sendShareDownloadNotification: jest.fn().mockResolvedValue(undefined),
      sendAnonymousShareDownloadNotification: jest
        .fn()
        .mockResolvedValue(undefined),
    };

    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };

    service = new FileService(
      prisma,
      {} as any,
      {} as any,
      configService,
      emailService,
      {} as any,
      cache,
    );
  });

  describe("global gates", () => {
    it("sends nothing when SMTP is disabled, even for a named recipient", async () => {
      configValues["smtp.enabled"] = false;

      await service.notifyRecipientDownload(SHARE_ID, FILE_NAME, "recipient-1");

      expect(prisma.share.findUnique).not.toHaveBeenCalled();
      expect(emailService.sendShareDownloadNotification).not.toHaveBeenCalled();
      expect(
        emailService.sendAnonymousShareDownloadNotification,
      ).not.toHaveBeenCalled();
    });

    it("sends nothing when the admin has not enabled download notifications", async () => {
      configValues["share.enableShareDownloadNotifications"] = false;

      await service.notifyRecipientDownload(SHARE_ID, FILE_NAME);

      expect(prisma.share.findUnique).not.toHaveBeenCalled();
      expect(
        emailService.sendAnonymousShareDownloadNotification,
      ).not.toHaveBeenCalled();
    });
  });

  describe("named recipient downloads (existing behaviour)", () => {
    it("emails the creator when a named recipient downloads a file", async () => {
      prisma.share.findUnique.mockResolvedValue({
        id: SHARE_ID,
        creator: {
          email: "creator@example.com",
          username: "creator",
          displayName: "Creator",
        },
        recipients: [{ email: "recipient@example.com" }],
      });
      prisma.user.findUnique.mockResolvedValue({
        displayName: null,
        username: "recipientUser",
      });

      await service.notifyRecipientDownload(SHARE_ID, FILE_NAME, "recipient-1");

      expect(cache.set).toHaveBeenCalledWith(
        "share-download-notification:share-123:recipient-1",
        true,
        expect.any(Number),
      );
      expect(emailService.sendShareDownloadNotification).toHaveBeenCalledWith(
        "creator@example.com",
        SHARE_ID,
        FILE_NAME,
        "recipient@example.com",
        "Creator",
        "recipientUser",
      );
      expect(
        emailService.sendAnonymousShareDownloadNotification,
      ).not.toHaveBeenCalled();
    });

    it("does not email again within the cooldown window for the same recipient", async () => {
      cache.get.mockResolvedValue(true);

      await service.notifyRecipientDownload(SHARE_ID, FILE_NAME, "recipient-1");

      expect(prisma.share.findUnique).not.toHaveBeenCalled();
      expect(emailService.sendShareDownloadNotification).not.toHaveBeenCalled();
    });

    it("does nothing when the share email recipients feature is disabled", async () => {
      configValues["share.enableShareEmailRecipients"] = false;

      await service.notifyRecipientDownload(SHARE_ID, FILE_NAME, "recipient-1");

      expect(prisma.share.findUnique).not.toHaveBeenCalled();
      expect(emailService.sendShareDownloadNotification).not.toHaveBeenCalled();
    });
  });

  describe("anonymous link downloads (new gap fix)", () => {
    it("emails the creator when notifyOnDownload is opted into on a plain link share", async () => {
      prisma.share.findUnique.mockResolvedValue({
        id: SHARE_ID,
        creator: {
          email: "creator@example.com",
          username: "creator",
          displayName: "Creator",
        },
        security: { notifyOnDownload: true },
      });

      await service.notifyRecipientDownload(SHARE_ID, FILE_NAME);

      expect(cache.set).toHaveBeenCalledWith(
        "share-download-notification:share-123:anonymous",
        true,
        expect.any(Number),
      );
      expect(
        emailService.sendAnonymousShareDownloadNotification,
      ).toHaveBeenCalledWith(
        "creator@example.com",
        SHARE_ID,
        FILE_NAME,
        "Creator",
      );
      expect(emailService.sendShareDownloadNotification).not.toHaveBeenCalled();
    });

    it("does nothing when the share creator did not opt in", async () => {
      prisma.share.findUnique.mockResolvedValue({
        id: SHARE_ID,
        creator: { email: "creator@example.com", username: "creator" },
        security: { notifyOnDownload: false },
      });

      await service.notifyRecipientDownload(SHARE_ID, FILE_NAME);

      expect(
        emailService.sendAnonymousShareDownloadNotification,
      ).not.toHaveBeenCalled();
    });

    it("does nothing for an anonymous (creatorless) share even if notifyOnDownload is somehow set", async () => {
      prisma.share.findUnique.mockResolvedValue({
        id: SHARE_ID,
        creator: null,
        security: { notifyOnDownload: true },
      });

      await service.notifyRecipientDownload(SHARE_ID, FILE_NAME);

      expect(
        emailService.sendAnonymousShareDownloadNotification,
      ).not.toHaveBeenCalled();
    });

    it("is not gated by the (unrelated) named-recipients feature flag", async () => {
      configValues["share.enableShareEmailRecipients"] = false;
      prisma.share.findUnique.mockResolvedValue({
        id: SHARE_ID,
        creator: { email: "creator@example.com", username: "creator" },
        security: { notifyOnDownload: true },
      });

      await service.notifyRecipientDownload(SHARE_ID, FILE_NAME);

      expect(
        emailService.sendAnonymousShareDownloadNotification,
      ).toHaveBeenCalled();
    });

    it("does not email again within the cooldown window for the same share", async () => {
      cache.get.mockResolvedValue(true);

      await service.notifyRecipientDownload(SHARE_ID, FILE_NAME);

      expect(prisma.share.findUnique).not.toHaveBeenCalled();
      expect(
        emailService.sendAnonymousShareDownloadNotification,
      ).not.toHaveBeenCalled();
    });
  });

  it("swallows errors instead of throwing (download must never fail because of a notification bug)", async () => {
    prisma.share.findUnique.mockRejectedValue(new Error("db exploded"));

    await expect(
      service.notifyRecipientDownload(SHARE_ID, FILE_NAME),
    ).resolves.toBeUndefined();
  });
});
