import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import * as moment from "moment";
import { I18nService } from "nestjs-i18n";
import { ConfigService } from "src/config/config.service";
import { FileService } from "src/file/file.service";
import { PrismaService } from "src/prisma/prisma.service";
import { parseRelativeDateToAbsolute } from "src/utils/date.util";
import { CreateReverseShareDTO } from "./dto/createReverseShare.dto";

@Injectable()
export class ReverseShareService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private fileService: FileService,
    private readonly i18n: I18nService,
  ) {}

  async create(data: CreateReverseShareDTO, creatorId: string) {
    // Parse date string to date
    const expirationDate = moment()
      .add(
        data.shareExpiration.split("-")[0],
        data.shareExpiration.split(
          "-",
        )[1] as moment.unitOfTime.DurationConstructor,
      )
      .toDate();

    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
    });
    if (!creator)
      throw new BadRequestException(this.i18n.t("auth.userNotFound"));

    if (creator.allowCreateReverseShares === false) {
      throw new ForbiddenException(
        this.i18n.t("reverseShare.notAllowedToCreate"),
      );
    }

    if (creator.maxReverseShares != null && creator.maxReverseShares > 0) {
      const activeReverseSharesCount = await this.prisma.reverseShare.count({
        where: {
          creatorId,
          shareExpiration: { gt: new Date() },
        },
      });
      if (activeReverseSharesCount >= creator.maxReverseShares) {
        throw new BadRequestException(
          this.i18n.t("reverseShare.maxReverseSharesExceeded", {
            args: { max: creator.maxReverseShares },
          }),
        );
      }
    }

    const parsedExpiration = parseRelativeDateToAbsolute(data.shareExpiration);
    const maxExpiration = this.config.get("share.maxExpiration");
    if (
      !creator?.isAdmin &&
      maxExpiration.value !== 0 &&
      parsedExpiration >
        moment().add(maxExpiration.value, maxExpiration.unit).toDate()
    ) {
      throw new BadRequestException(this.i18n.t("share.maxExpirationExceeded"));
    }
    const userMaxShareSize = creator?.shareSizeLimit
      ? parseInt(creator.shareSizeLimit)
      : parseInt(this.config.get("share.maxSize"));

    if (userMaxShareSize < parseInt(data.maxShareSize))
      throw new BadRequestException(
        this.i18n.t("reverseShare.maxShareSizeExceeded", {
          args: { maxSize: userMaxShareSize },
        }),
      );

    if (data.token) {
      if (!(await this.isReverseShareTokenAvailable(data.token)).isAvailable) {
        throw new BadRequestException(this.i18n.t("reverseShare.tokenInUse"));
      }
    }

    try {
      const reverseShare = await this.prisma.reverseShare.create({
        data: {
          token: data.token || undefined,
          shareExpiration: expirationDate,
          remainingUses: data.maxUseCount,
          maxShareSize: data.maxShareSize,
          sendEmailNotification: data.sendEmailNotification,
          simplified: data.simplified,
          publicAccess: data.publicAccess,
          creatorId,
        },
      });

      return reverseShare.token;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
        throw new BadRequestException(this.i18n.t("reverseShare.tokenInUse"));
      }
      throw e;
    }
  }

  async isReverseShareTokenAvailable(token: string) {
    const reverseShare = await this.prisma.reverseShare.findUnique({
      where: { token },
    });
    return { isAvailable: !reverseShare };
  }

  async getByToken(reverseShareToken?: string) {
    if (!reverseShareToken) return null;

    const reverseShare = await this.prisma.reverseShare.findUnique({
      where: { token: reverseShareToken },
      include: { creator: true },
    });

    return reverseShare;
  }

  async getAllByUser(userId: string) {
    const reverseShares = await this.prisma.reverseShare.findMany({
      where: {
        creatorId: userId,
        shareExpiration: { gt: new Date() },
      },
      orderBy: {
        shareExpiration: "desc",
      },
      include: { shares: { include: { creator: true } } },
    });

    return reverseShares;
  }

  async isValid(reverseShareToken: string) {
    const reverseShare = await this.prisma.reverseShare.findUnique({
      where: { token: reverseShareToken },
    });

    if (!reverseShare) return false;

    const isExpired = new Date() > reverseShare.shareExpiration;
    const remainingUsesExceeded = reverseShare.remainingUses <= 0;

    return !(isExpired || remainingUsesExceeded);
  }

  /**
   * Atomically consumes one use of a reverse share (upload request) link.
   *
   * `isValid` above is only an advisory read used to let/deny starting an
   * upload early - it reads `remainingUses` once and is not safe to rely on
   * for actually enforcing the limit, because two (or more) concurrent
   * uploads against the same link can all read the same pre-decrement
   * value, all pass that check, and only decrement afterward on completion.
   * That is the same TOCTOU race class fixed for `share.maxViews` in
   * `ShareService.getShareToken` (see commit 6302d7d0), just on the
   * reverse-share "max uses" limit instead - a single-use upload link could
   * otherwise accept uploads from more than one concurrent completer.
   *
   * This folds the check into the decrement's SQL `WHERE` clause via a
   * single atomic `updateMany`, so at most `remainingUses` concurrent
   * completions can ever win the write no matter how many arrive at once.
   * Returns `false` if the link had no remaining uses left (the caller
   * should reject the completion), `true` if this call consumed a use.
   */
  async consumeUse(reverseShareToken: string): Promise<boolean> {
    const { count } = await this.prisma.reverseShare.updateMany({
      where: {
        token: reverseShareToken,
        remainingUses: { gt: 0 },
      },
      data: { remainingUses: { decrement: 1 } },
    });

    return count > 0;
  }

  async remove(id: string) {
    await this.prisma.share.updateMany({
      where: { reverseShareId: id },
      data: {
        reverseShareId: null,
        expiration: new Date(),
      },
    });

    await this.prisma.reverseShare.delete({ where: { id } });
  }
}
