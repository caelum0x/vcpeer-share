import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { Share } from "@prisma/client";
import { GetShare } from "src/share/decorator/getShare.decorator";
import { IdValidation } from "src/share/guard/shareIdValidation.guard";
import { ShareOwnerGuard } from "src/share/guard/shareOwner.guard";
import { ShareAnalyticsService } from "./shareAnalytics.service";

@Controller("shares/:id/analytics")
export class ShareAnalyticsController {
  constructor(private readonly shareAnalyticsService: ShareAnalyticsService) {}

  // Same access rule as PATCH/DELETE /shares/:id (ShareOwnerGuard): the
  // share's creator, an admin, or — for anonymous (no-account) shares —
  // whoever holds the id, consistent with how every other owner-only
  // share endpoint already behaves.
  @Get()
  @UseGuards(IdValidation, ShareOwnerGuard)
  async getAnalytics(
    @Param("id") id: string,
    @GetShare() share: Share,
  ) {
    return this.shareAnalyticsService.getAnalytics(id, share.expiration);
  }
}
