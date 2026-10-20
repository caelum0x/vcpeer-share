import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy.validate", () => {
  const USER_ID = "user-1";

  let prisma: any;
  let strategy: JwtStrategy;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
    };

    const config = {
      get: jest.fn().mockReturnValue("test-secret"),
    };

    strategy = new JwtStrategy(config as any, prisma);
  });

  it("returns the user when the account is active", async () => {
    const user = { id: USER_ID, isActivated: true };
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(strategy.validate({ sub: USER_ID })).resolves.toEqual(user);
  });

  it("rejects a deactivated account even with an otherwise valid token", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      isActivated: false,
    });

    await expect(strategy.validate({ sub: USER_ID })).resolves.toBeNull();
  });

  it("rejects when the user no longer exists", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(strategy.validate({ sub: USER_ID })).resolves.toBeNull();
  });
});
