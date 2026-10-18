import { EmailService } from "./email.service";

const sendMailMock = jest.fn().mockResolvedValue(undefined);

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
}));

describe("EmailService.sendAnonymousShareDownloadNotification", () => {
  let config: any;
  let i18n: any;
  let service: EmailService;

  const configValues: Record<string, unknown> = {
    "smtp.enabled": true,
    "smtp.host": "smtp.example.com",
    "smtp.port": 587,
    "smtp.username": "user",
    "smtp.password": "pass",
    "smtp.allowUnauthorizedCertificates": false,
    "smtp.email": "noreply@vcpeer.com",
    "general.appName": "VCPeer Send",
    "general.appUrl": "https://send.vcpeer.com",
    "email.sendHtmlEmails": false,
    "email.shareLinkDownloadNotificationSubject": "Your file was downloaded",
    "email.shareLinkDownloadNotificationMessage":
      "Hey!\\n\\n{fileName} was just downloaded from your share: {shareUrl}\\n\\nVCPeer Send",
  };

  beforeEach(() => {
    sendMailMock.mockClear();
    config = { get: jest.fn((key: string) => configValues[key]) };
    i18n = { t: jest.fn((key: string) => key) };
    service = new EmailService(config, i18n);
  });

  it("sends the creator a download notification without requiring a recipient identity", async () => {
    await service.sendAnonymousShareDownloadNotification(
      "creator@example.com",
      "share-123",
      "report.pdf",
      "Creator",
    );

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toEqual({ name: "Creator", address: "creator@example.com" });
    expect(call.subject).toBe("Your file was downloaded");
    expect(call.text).toBe(
      "Hey!\n\nreport.pdf was just downloaded from your share: https://send.vcpeer.com/s/share-123\n\nVCPeer Send",
    );
  });

  it("falls back gracefully when the creator has no display name", async () => {
    await service.sendAnonymousShareDownloadNotification(
      "creator@example.com",
      "share-123",
      "report.pdf",
    );

    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toBe("creator@example.com");
  });

  it("rejects when SMTP is not configured", async () => {
    configValues["smtp.enabled"] = false;

    await expect(
      service.sendAnonymousShareDownloadNotification(
        "creator@example.com",
        "share-123",
        "report.pdf",
      ),
    ).rejects.toThrow();
  });
});
