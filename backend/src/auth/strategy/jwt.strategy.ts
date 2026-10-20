import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { User } from "@prisma/client";
import { Request } from "express";
import { Strategy } from "passport-jwt";
import { ConfigService } from "src/config/config.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    config.get("internal.jwtSecret");
    super({
      jwtFromRequest: JwtStrategy.extractJWT,
      secretOrKey: config.get("internal.jwtSecret"),
    });
  }

  private static extractJWT(req: Request) {
    if (!req.cookies.access_token) return null;
    return req.cookies.access_token;
  }

  async validate(payload: { sub: string }) {
    const user: User = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    // A deactivated account must lose access immediately, not just once its
    // short-lived access token naturally expires or its refresh token is
    // used again.
    if (!user || !user.isActivated) return null;

    return user;
  }
}
