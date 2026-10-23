import User from "./user.type";

export type Share = {
  id: string;
  name?: string;
  files: any;
  creator?: User;
  description?: string;
  expiration: Date;
  size: number;
  hasPassword: boolean;
};

export type CompletedShare = Share & {
  /**
   * undefined means is not reverse share
   * true means server was send email to reverse share creator
   * false means server was not send email to reverse share creator
   * */
  notifyReverseShareCreator: boolean | undefined;
};

export type CreateShare = {
  id: string;
  name?: string;
  description?: string;
  recipients: string[];
  expiration: string;
  security: ShareSecurity;
  size?: number;
  // Where this share was created from — "live" or "booking" when the
  // upload page was opened via a cross-sell CTA's ?ref= deep link, unset
  // for direct traffic / SEO landing pages.
  source?: string;
};

export type UpdateShare = {
  name?: string | null;
  description?: string | null;
  expiration?: string;
  security?: {
    password?: string;
    removePassword?: boolean;
    maxViews?: number | null;
    notifyOnDownload?: boolean;
  };
};

export type ShareMetaData = {
  id: string;
  isZipReady: boolean;
};

export type MyShare = Omit<Share, "hasPassword"> & {
  views: number;
  createdAt: Date;
  recipients: string[];
  security: MyShareSecurity;
  // "live" | "booking" | undefined — see CreateShare.source.
  source?: string;
};

export type MyReverseShare = {
  id: string;
  maxShareSize: string;
  shareExpiration: Date;
  remainingUses: number;
  token: string;
  shares: MyShare[];
};

export type ShareSecurity = {
  maxViews?: number;
  password?: string;
  restrictToRecipients?: boolean;
  notifyOnDownload?: boolean;
};

export type MyShareSecurity = {
  passwordProtected: boolean;
  maxViews?: number;
  restrictToRecipients: boolean;
  notifyOnDownload: boolean;
};

export type ShareAnalyticsCountryBreakdown = {
  country: string;
  count: number;
};

export type ShareAnalyticsReferrerBreakdown = {
  referrer: string;
  count: number;
};

export type ShareAnalyticsTimelineEntry = {
  date: string;
  views: number;
  downloads: number;
};

export type ShareAnalytics = {
  totalViews: number;
  totalDownloads: number;
  uniqueVisitors: number;
  topCountries: ShareAnalyticsCountryBreakdown[];
  topReferrers: ShareAnalyticsReferrerBreakdown[];
  timeline: ShareAnalyticsTimelineEntry[];
  expiresAt: Date | null;
  expiresInMs: number | null;
};
