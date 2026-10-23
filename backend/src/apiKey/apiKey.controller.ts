import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { User } from "@prisma/client";
import { GetUser } from "src/auth/decorator/getUser.decorator";
import { SessionOnlyGuard } from "src/auth/guard/sessionOnly.guard";
import { ApiKeyService } from "./apiKey.service";
import { CreateApiKeyDTO } from "./dto/createApiKey.dto";

// Session-only (see SessionOnlyGuard) on every route here: minting,
// listing, and revoking a user's own API keys is account management, not
// part of the developer API surface those keys unlock.
@Controller("apiKeys")
@UseGuards(SessionOnlyGuard)
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  @Get()
  async list(@GetUser() user: User) {
    return this.apiKeyService.list(user.id);
  }

  @Post()
  @Throttle({
    default: {
      limit: 10,
      ttl: 60 * 1000,
    },
  })
  async create(@Body() body: CreateApiKeyDTO, @GetUser() user: User) {
    return this.apiKeyService.create(user.id, body.name, body.expiresInDays);
  }

  @Delete(":id")
  async revoke(@Param("id") id: string, @GetUser() user: User) {
    await this.apiKeyService.revoke(user.id, id);
    return { success: true };
  }
}
