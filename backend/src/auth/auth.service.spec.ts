// AuthService pulls in OAuthService, which imports the ESM-only `nanoid`
// package. Jest (CommonJS transform) can't load that module directly, so
// stub it out -- this test never exercises OAuthService's nanoid usage.
jest.mock("nanoid", () => ({ nanoid: () => "stub-id" }));

import { AuthService } from "./auth.service";

describe("AuthService.createLoginToken", () => {
  const USER_ID = "user-1";

  let prisma: any;
  let tx: any;
  let service: AuthService;

  beforeEach(() => {
    tx = {
      loginToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ token: "new-token" }),
      },
    };

    prisma = {
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(tx)),
    };

    service = new AuthService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { t: jest.fn((key: string) => key) } as any,
    );
  });

  it("invalidates every prior unused loginToken for the user before issuing a new one", async () => {
    // Regression: generateToken() used to create a fresh loginToken without
    // touching any earlier, still-unused, still-unexpired tokens for the
    // same user. Signing in multiple times (retrying across tabs/devices)
    // left every one of those tokens valid for its full 5-minute window, so
    // an older or stale loginToken could still complete the TOTP step.
    const loginToken = await service.createLoginToken(USER_ID);

    expect(tx.loginToken.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, used: false },
      data: { used: true },
    });
    expect(tx.loginToken.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, expiresAt: expect.any(Date) },
    });
    expect(loginToken).toBe("new-token");
  });

  it("runs the invalidation and the new token creation in the same transaction", async () => {
    await service.createLoginToken(USER_ID);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // Both calls must happen on the transaction client, not the top-level
    // prisma client, so they commit or roll back together.
    expect(tx.loginToken.updateMany).toHaveBeenCalled();
    expect(tx.loginToken.create).toHaveBeenCalled();
  });
});
