import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { ApiKeyService } from "src/apiKey/apiKey.service";
import { extractApiKeyToken } from "src/apiKey/apiKey.util";
import { ConfigService } from "src/config/config.service";

/**
 * Same contract as JwtGuard (cookie JWT, falling back to
 * `security.allowUnauthenticatedShares`), plus one more option tried
 * first: a `vcp_...` API key in the `Authorization`/`x-api-key` header.
 *
 * Deliberately a sibling of JwtGuard rather than a change to it — the
 * share/file endpoints this guards (create/list/update/delete a share,
 * upload/delete a file) are the intended "developer API" surface. Account
 * management, admin config, and password/TOTP endpoints keep using plain
 * JwtGuard untouched, so a leaked API key can never reach those.
 */
@Injectable()
export class JwtOrApiKeyGuard extends AuthGuard("jwt") {
  constructor(
    protected config: ConfigService,
    private apiKeyService: ApiKeyService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const apiKeyToken = extractApiKeyToken(request);
    if (apiKeyToken) {
      const user = await this.apiKeyService.authenticate(apiKeyToken);
      if (user) {
        request.user = user;
        return true;
      }
    }

    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      return this.config.get("security.allowUnauthenticatedShares");
    }
  }
}
