import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import * as fs from "fs";
import * as moment from "moment";
import { EmailService } from "src/email/email.service";
import { FileService } from "src/file/file.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ReverseShareService } from "src/reverseShare/reverseShare.service";
import { ConfigService } from "src/config/config.service";
import { SHARE_DIRECTORY } from "../constants";

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private prisma: PrismaService,
    private reverseShareService: ReverseShareService,
    private fileService: FileService,
    private configServer: ConfigService,
    private emailService: EmailService,
  ) {}

  @Cron("* * * * *")
  async deleteExpiredShares() {
    const fileRetentionPeriod = this.configServer.get(
      "share.fileRetentionPeriod",
    );

    if (fileRetentionPeriod.value === -1) {
      return;
    }

    const thresholdDate = moment()
      .subtract(fileRetentionPeriod.value, fileRetentionPeriod.unit)
      .toDate();

    const expiredShares = await this.prisma.share.findMany({
      where: {
        // We want to remove only shares that have an expiration date + retention period less than the current date, but not 0
        AND: [
          { expiration: { lt: thresholdDate } },
          { expiration: { not: moment(0).toDate() } },
        ],
      },
    });

    for (const expiredShare of expiredShares) {
      await this.fileService.deleteAllFiles(expiredShare.id);
      await this.prisma.share.delete({
        where: { id: expiredShare.id },
      });
    }

    if (expiredShares.length > 0) {
      this.logger.log(`Deleted ${expiredShares.length} expired shares`);
    }
  }

  // Sends a "your share expires soon" email to a share's creator once,
  // shortly before it actually expires. This is the single biggest
  // retention/re-engagement gap identified for VCPeer Send: today a sender
  // who doesn't bookmark their own link has zero reason to come back to
  // share.vcpeer.com before the file disappears for good, and no way to
  // extend it in time if they still need it. Runs every 15 minutes so the
  // reminder lands close to the configured threshold instead of drifting by
  // up to an hour.
  @Cron("*/15 * * * *")
  async sendShareExpirationReminders() {
    if (
      !this.configServer.get("smtp.enabled") ||
      !this.configServer.get("share.enableShareExpirationReminders")
    ) {
      return;
    }

    const threshold = this.configServer.get(
      "share.expirationReminderThreshold",
    );
    const now = moment();
    const windowEnd = now.clone().add(threshold.value, threshold.unit).toDate();

    const sharesNearingExpiration = await this.prisma.share.findMany({
      where: {
        creatorId: { not: null },
        expirationReminderSentAt: null,
        uploadLocked: true,
        AND: [
          { expiration: { gt: now.toDate() } },
          { expiration: { lte: windowEnd } },
          // "never" expiration is stored as the unix epoch (moment(0)),
          // same sentinel used by deleteExpiredShares above — those shares
          // are never "nearing" anything and must never match here.
          { expiration: { not: moment(0).toDate() } },
        ],
      },
      include: { creator: true, files: true },
    });

    let remindersSent = 0;
    for (const share of sharesNearingExpiration) {
      if (!share.creator?.email) continue;

      try {
        await this.emailService.sendShareExpirationReminder(
          share.creator.email,
          share.id,
          share.name,
          share.files.length,
          share.expiration,
          share.creator.displayName || share.creator.username,
        );
        await this.prisma.share.update({
          where: { id: share.id },
          data: { expirationReminderSentAt: new Date() },
        });
        remindersSent++;
      } catch (e) {
        // Best-effort: one SMTP hiccup or bad address must not stop the
        // reminder from going out to every other share in this batch, and
        // must not mark this share as reminded so it gets retried on the
        // next tick.
        this.logger.error(
          `Failed to send expiration reminder for share ${share.id}`,
          e,
        );
      }
    }

    if (remindersSent > 0) {
      this.logger.log(`Sent ${remindersSent} share expiration reminders`);
    }
  }

  @Cron("0 * * * *")
  async deleteExpiredReverseShares() {
    const expiredReverseShares = await this.prisma.reverseShare.findMany({
      where: {
        shareExpiration: { lt: new Date() },
      },
    });

    for (const expiredReverseShare of expiredReverseShares) {
      await this.reverseShareService.remove(expiredReverseShare.id);
    }

    if (expiredReverseShares.length > 0) {
      this.logger.log(
        `Deleted ${expiredReverseShares.length} expired reverse shares`,
      );
    }
  }

  @Cron("0 */6 * * *")
  async deleteUnfinishedShares() {
    const cutoff = moment().subtract(1, "day").toDate();
    const unfinishedShares = await this.prisma.share.findMany({
      where: {
        uploadLocked: false,
        OR: [
          { updatedAt: { lt: cutoff } },
          { updatedAt: { equals: null }, createdAt: { lt: cutoff } },
        ],
      },
    });

    for (const unfinishedShare of unfinishedShares) {
      await this.fileService.deleteAllFiles(unfinishedShare.id);
      await this.prisma.share.delete({
        where: { id: unfinishedShare.id },
      });
    }

    if (unfinishedShares.length > 0) {
      this.logger.log(`Deleted ${unfinishedShares.length} unfinished shares`);
    }
  }

  @Cron("0 0 * * *")
  deleteTemporaryFiles() {
    let filesDeleted = 0;

    const shareDirectories = fs
      .readdirSync(SHARE_DIRECTORY, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const shareDirectory of shareDirectories) {
      const temporaryFiles = fs
        .readdirSync(`${SHARE_DIRECTORY}/${shareDirectory}`)
        .filter((file) => file.endsWith(".tmp-chunk"));

      for (const file of temporaryFiles) {
        const stats = fs.statSync(
          `${SHARE_DIRECTORY}/${shareDirectory}/${file}`,
        );
        const isOlderThanOneDay = moment(stats.mtime)
          .add(1, "day")
          .isBefore(moment());

        if (isOlderThanOneDay) {
          fs.rmSync(`${SHARE_DIRECTORY}/${shareDirectory}/${file}`);
          filesDeleted++;
        }
      }
    }

    this.logger.log(`Deleted ${filesDeleted} temporary files`);
  }

  @Cron("1 * * * *")
  async deleteExpiredTokens() {
    const { count: refreshTokenCount } =
      await this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

    const { count: loginTokenCount } = await this.prisma.loginToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const { count: resetPasswordTokenCount } =
      await this.prisma.resetPasswordToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

    const deletedTokensCount =
      refreshTokenCount + loginTokenCount + resetPasswordTokenCount;

    if (deletedTokensCount > 0) {
      this.logger.log(`Deleted ${deletedTokensCount} expired refresh tokens`);
    }
  }

  @Cron("0 * * * *")
  async deleteUnactivatedUsers() {
    const cutoff = moment().subtract(24, "hours").toDate();
    const unactivatedUsers = await this.prisma.user.findMany({
      where: {
        isActivated: false,
        createdAt: { lt: cutoff },
      },
      include: { shares: true },
    });

    for (const user of unactivatedUsers) {
      await Promise.all(
        user.shares.map((share) => this.fileService.deleteAllFiles(share.id)),
      );
      await this.prisma.user.delete({ where: { id: user.id } });
    }

    if (unactivatedUsers.length > 0) {
      this.logger.log(`Deleted ${unactivatedUsers.length} unactivated users`);
    }
  }
}
