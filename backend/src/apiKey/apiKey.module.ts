import { Global, Module } from "@nestjs/common";
import { ApiKeyController } from "./apiKey.controller";
import { ApiKeyService } from "./apiKey.service";

// Global: ApiKeyService backs auth guards (JwtOrApiKeyGuard) used by
// controllers across several feature modules (share, file), the same
// reason PrismaModule/ConfigModule are global in this codebase — without
// it every one of those modules would need to explicitly import this one
// just to satisfy a guard's constructor dependency.
@Global()
@Module({
  controllers: [ApiKeyController],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
