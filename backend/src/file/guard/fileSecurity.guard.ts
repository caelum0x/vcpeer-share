import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";
import * as moment from "moment";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { ShareSecurityGuard } from "src/share/guard/shareSecurity.guard";
import { ShareService } from "src/share/share.service";
import { ConfigService } from "src/config/config.service";

@Injectable()
export class FileSecurityGuard extends ShareSecurityGuard {
  constructor(
    private _shareService: ShareService,
    private _prisma: PrismaService,
    private _config: ConfigService,
    private readonly _i18n: I18nService,
  ) {
    super(_shareService, _prisma, _config, _i18n);
  }

  isBase64(toCheck: string) {
    const isBase64 = /^[a-zA-Z0-9_-]*={0,2}$/.test(toCheck);
    return isBase64;
  }

  async canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();

    const shareId = Object.prototype.hasOwnProperty.call(
      request.params,
      "shareId",
    )
      ? request.params.shareId
      : request.params.id;

    if (!this.isBase64(shareId)) {
      throw new BadRequestException(this._i18n.t("file.invalidIdFormat"));
    }

    const share = await this._prisma.share.findUnique({
      where: { id: shareId },
      include: {
        security: true,
        reverseShare: true,
        userRecipients: { select: { userId: true } },
        recipients: { select: { email: true } },
      },
    });

    // Only password-protected shares actually need a verified share token
    // (it's the only proof that the password was entered correctly). Shares
    // without a password must stay directly downloadable even if a
    // leftover/invalid `share_<id>_token` cookie happens to be sent (e.g. the
    // share id was reused, the token predates a security change, or a proxy
    // forwarded an unrelated cookie) — branching on cookie *presence* instead
    // of on whether the share actually requires one incorrectly turned those
    // into hard "share_token_required" failures for fully public shares.
    if (!share?.security?.password) {
      const user = await this.authenticateUser(context);

      // If admin access is enabled and user is admin, allow access
      if (this._config.get("security.allowAdminAccessAllShares")) {
        if (user?.isAdmin) {
          return true;
        }
      }

      if (
        !share ||
        (moment().isAfter(share.expiration) &&
          !moment(share.expiration).isSame(0))
      ) {
        throw new NotFoundException(this._i18n.t("file.notFound"));
      }

      // Only the creator and reverse share creator can access the reverse share
      // if it's not public
      if (
        share.reverseShare &&
        !share.reverseShare.publicAccess &&
        share.creatorId !== user?.id &&
        share.reverseShare.creatorId !== user?.id
      )
        throw new ForbiddenException(
          this._i18n.t("share.privateShare"),
          "private_share",
        );

      if (share.security?.restrictToRecipients) {
        const isCreator = user && share.creatorId === user.id;
        const isRecipient = await this.isRecipient(share, user);

        if (!isCreator && !isRecipient) {
          throw new ForbiddenException(
            this._i18n.t("share.restrictedToRecipients"),
            "share_restricted_to_recipients",
          );
        }
      }

      if (share.security?.maxViews && share.security.maxViews <= share.views) {
        throw new ForbiddenException(
          this._i18n.t("share.maxViewsExceeded"),
          "share_max_views_exceeded",
        );
      }

      // Do NOT increment here: the view for this visit was already counted
      // once by ShareService.getShareToken, which the frontend always calls
      // before it can load a share (password-protected or not — see
      // ShareSecurityGuard's mandatory token check). Incrementing again per
      // file access double-counted every preview/download, so a public
      // share with e.g. maxViews=1 locked out its own single visitor as
      // soon as they opened a second file (or even the first).
      return true;
    } else {
      return super.canActivate(context);
    }
  }
}
