import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { Request } from "express";
import * as moment from "moment";
import { PrismaService } from "src/prisma/prisma.service";

export type ShareAccessAction = "view" | "download";

export interface ShareAnalyticsCountryBreakdown {
  country: string;
  count: number;
}

export interface ShareAnalyticsReferrerBreakdown {
  referrer: string;
  count: number;
}

export interface ShareAnalyticsTimelineEntry {
  date: string;
  views: number;
  downloads: number;
}

export interface ShareAnalyticsResult {
  totalViews: number;
  totalDownloads: number;
  uniqueVisitors: number;
  topCountries: ShareAnalyticsCountryBreakdown[];
  topReferrers: ShareAnalyticsReferrerBreakdown[];
  timeline: ShareAnalyticsTimelineEntry[];
  expiresAt: Date | null;
  expiresInMs: number | null;
}

// Salt for the one-way IP hash. Overridable via env so a self-hoster can
// set their own; a stable default is fine since the goal is only to avoid
// storing raw IPs at rest, not to defend against a determined attacker who
// already has database access.
const IP_HASH_SALT =
  process.env.SHARE_ANALYTICS_IP_SALT || "vcpeer-send-share-analytics-v1";

@Injectable()
export class ShareAnalyticsService {
  private readonly logger = new Logger(ShareAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records one real view/download of a share. Called from controller
   * handlers *after* ShareSecurityGuard/FileSecurityGuard has already
   * granted access, so this only ever sees authorized traffic. Always
   * best-effort: a failure here (e.g. a transient DB hiccup) must never
   * turn into a 500 for an otherwise-successful file view or download, so
   * every failure is caught and logged, never rethrown.
   */
  async recordAccess(
    shareId: string,
    action: ShareAccessAction,
    req: Request,
  ): Promise<void> {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      const ipHash = crypto
        .createHash("sha256")
        .update(`${IP_HASH_SALT}:${ip}`)
        .digest("hex")
        .slice(0, 16);

      // Cloudflare fronts share.vcpeer.com already (see deploy/RUNBOOK.md)
      // and sets this header on every request that passes through it — no
      // third-party GeoIP lookup or paid service needed. Falls back to
      // "XX" for local dev / direct IP access that bypasses Cloudflare.
      const countryHeader = req.headers["cf-ipcountry"];
      const country = (
        Array.isArray(countryHeader) ? countryHeader[0] : countryHeader
      )?.toUpperCase();

      const referrerHeader = req.headers["referer"] || req.headers["referrer"];
      const rawReferrer = Array.isArray(referrerHeader)
        ? referrerHeader[0]
        : referrerHeader;

      await this.prisma.shareAccessEvent.create({
        data: {
          shareId,
          action,
          ipHash,
          country: country || "XX",
          referrer: rawReferrer ? rawReferrer.slice(0, 500) : null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record ${action} event for share ${shareId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async getAnalytics(
    shareId: string,
    expiration: Date,
  ): Promise<ShareAnalyticsResult> {
    const events = await this.prisma.shareAccessEvent.findMany({
      where: { shareId },
      orderBy: { createdAt: "asc" },
    });

    let totalViews = 0;
    let totalDownloads = 0;
    const uniqueIpHashes = new Set<string>();
    const countryCounts = new Map<string, number>();
    const referrerCounts = new Map<string, number>();
    const dayCounts = new Map<string, { views: number; downloads: number }>();

    for (const event of events) {
      if (event.action === "download") totalDownloads += 1;
      else totalViews += 1;

      uniqueIpHashes.add(event.ipHash);

      const country = event.country || "XX";
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);

      const referrerKey = event.referrer
        ? this.normalizeReferrer(event.referrer)
        : "Direct";
      referrerCounts.set(referrerKey, (referrerCounts.get(referrerKey) || 0) + 1);

      const day = event.createdAt.toISOString().slice(0, 10);
      const dayEntry = dayCounts.get(day) || { views: 0, downloads: 0 };
      if (event.action === "download") dayEntry.downloads += 1;
      else dayEntry.views += 1;
      dayCounts.set(day, dayEntry);
    }

    const topCountries = [...countryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    const topReferrers = [...referrerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count }));

    const timeline = [...dayCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => ({ date, ...counts }));

    const expiresNever = moment(expiration).isSame(0);
    const expiresInMs = expiresNever
      ? null
      : Math.max(moment(expiration).diff(moment()), 0);

    return {
      totalViews,
      totalDownloads,
      uniqueVisitors: uniqueIpHashes.size,
      topCountries,
      topReferrers,
      timeline,
      expiresAt: expiresNever ? null : expiration,
      expiresInMs,
    };
  }

  private normalizeReferrer(referrer: string): string {
    try {
      return new URL(referrer).hostname || referrer.slice(0, 100);
    } catch {
      return referrer.slice(0, 100);
    }
  }
}
