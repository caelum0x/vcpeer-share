import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { User } from "@prisma/client";
import * as argon from "argon2";
import { randomBytes } from "crypto";
import * as moment from "moment";
import { I18nService } from "nestjs-i18n";
import { ConfigService } from "src/config/config.service";
import { PrismaService } from "src/prisma/prisma.service";
import { API_KEY_PREFIX } from "./apiKey.util";

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyId: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });
  }

  async create(userId: string, name: string, expiresInDays?: number) {
    if (!this.config.get("security.enableApiKeys")) {
      throw new BadRequestException(this.i18n.t("apiKey.disabled"));
    }

    const maxApiKeysPerUser = parseInt(
      this.config.get("security.maxApiKeysPerUser"),
    );
    if (maxApiKeysPerUser > 0) {
      const existingCount = await this.prisma.apiKey.count({
        where: { userId },
      });
      if (existingCount >= maxApiKeysPerUser) {
        throw new BadRequestException(
          this.i18n.t("apiKey.maxApiKeysExceeded", {
            args: { max: maxApiKeysPerUser },
          }),
        );
      }
    }

    // keyId is the lookup half (stored in plaintext so a single indexed
    // query can find the row); secret is the half that actually proves
    // possession of the key and never touches the DB except as an argon2
    // hash. Splitting them this way means authenticate() never has to
    // scan every API key in the table to find a match.
    const keyId = randomBytes(9).toString("base64url");
    const secret = randomBytes(32).toString("base64url");
    const secretHash = await argon.hash(secret);

    const expiresAt =
      expiresInDays && expiresInDays > 0
        ? moment().add(expiresInDays, "days").toDate()
        : null;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name,
        keyId,
        secretHash,
        expiresAt,
        userId,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      // Only ever returned here, at creation time. It can't be recovered
      // afterwards — list() never selects secretHash back out.
      token: `${API_KEY_PREFIX}${keyId}.${secret}`,
    };
  }

  async revoke(userId: string, id: string) {
    const { count } = await this.prisma.apiKey.deleteMany({
      where: { id, userId },
    });
    if (count === 0) {
      throw new BadRequestException(this.i18n.t("apiKey.notFound"));
    }
  }

  /**
   * Validates a raw `vcp_<keyId>.<secret>` token and, if it checks out,
   * returns the owning (still-activated) user — exactly the same shape
   * JwtStrategy.validate returns, so every downstream guard/@GetUser()
   * consumer works identically regardless of which auth method was used.
   * Returns null on any failure (malformed token, unknown keyId, bad
   * secret, expired key, deactivated user) without distinguishing which,
   * so callers can't be used as an oracle to enumerate valid keyIds.
   */
  async authenticate(token: string): Promise<User | null> {
    if (!this.config.get("security.enableApiKeys")) return null;
    if (!token.startsWith(API_KEY_PREFIX)) return null;

    const rest = token.slice(API_KEY_PREFIX.length);
    const separatorIndex = rest.indexOf(".");
    if (separatorIndex === -1) return null;

    const keyId = rest.slice(0, separatorIndex);
    const secret = rest.slice(separatorIndex + 1);
    if (!keyId || !secret) return null;

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyId },
      include: { user: true },
    });
    if (!apiKey) return null;

    if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
      return null;
    }

    const isValid = await argon
      .verify(apiKey.secretHash, secret)
      .catch(() => false);
    if (!isValid) return null;

    if (!apiKey.user || !apiKey.user.isActivated) return null;

    // Best-effort — never block or fail the actual authenticated request
    // over this bookkeeping write.
    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) =>
        this.logger.warn(
          `Failed to update lastUsedAt for API key ${apiKey.id}: ${error}`,
        ),
      );

    return apiKey.user;
  }
}
