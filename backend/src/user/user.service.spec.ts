import { UserSevice } from "./user.service";

describe("UserSevice.update", () => {
  const USER_ID = "user-1";

  let prisma: any;
  let configService: any;
  let service: UserSevice;
  let tx: any;

  beforeEach(() => {
    tx = {
      user: {
        update: jest.fn().mockResolvedValue({ id: USER_ID }),
      },
      refreshToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    prisma = {
      $transaction: jest.fn((callback: (tx: any) => unknown) =>
        callback(tx),
      ),
    };

    configService = {
      // customPasswordPolicy disabled -> enforcePasswordPolicy short-circuits
      get: jest.fn().mockReturnValue(false),
    };

    service = new UserSevice(
      prisma,
      {} as any,
      {} as any,
      configService,
      { t: (key: string) => key } as any,
    );
  });

  it("revokes all existing sessions when an admin sets a new password", async () => {
    await service.update(USER_ID, { password: "BrandNewPassword1!" } as any);

    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  it("revokes all existing sessions when an admin deactivates the account", async () => {
    await service.update(USER_ID, { isActivated: false } as any);

    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  it("does not touch sessions for unrelated field updates", async () => {
    await service.update(USER_ID, { displayName: "New Name" } as any);

    expect(tx.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it("does not revoke sessions when explicitly re-activating a user", async () => {
    await service.update(USER_ID, { isActivated: true } as any);

    expect(tx.refreshToken.deleteMany).not.toHaveBeenCalled();
  });
});
