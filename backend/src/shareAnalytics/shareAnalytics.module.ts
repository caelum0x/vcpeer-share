import { Module } from "@nestjs/common";
import { ShareAnalyticsController } from "./shareAnalytics.controller";
import { ShareAnalyticsService } from "./shareAnalytics.service";

@Module({
  controllers: [ShareAnalyticsController],
  providers: [ShareAnalyticsService],
  exports: [ShareAnalyticsService],
})
export class ShareAnalyticsModule {}
