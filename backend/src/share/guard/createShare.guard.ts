import { ExecutionContext, Injectable } from "@nestjs/common";
import { ApiKeyService } from "src/apiKey/apiKey.service";
import { JwtOrApiKeyGuard } from "src/auth/guard/jwtOrApiKey.guard";
import { ConfigService } from "src/config/config.service";
import { ReverseShareService } from "src/reverseShare/reverseShare.service";

@Injectable()
export class CreateShareGuard extends JwtOrApiKeyGuard {
  constructor(
    configService: ConfigService,
    apiKeyService: ApiKeyService,
    private reverseShareService: ReverseShareService,
  ) {
    super(configService, apiKeyService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (await super.canActivate(context)) return true;

    const reverseShareTokenId = context.switchToHttp().getRequest()
      .cookies.reverse_share_token;

    if (!reverseShareTokenId) return false;

    const isReverseShareTokenValid =
      await this.reverseShareService.isValid(reverseShareTokenId);

    return isReverseShareTokenValid;
  }
}
