import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { LoginThrottlerGuard } from "../common/guards/login-throttler.guard";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { JwtPayload } from "@hms/types";

/**
 * Ten attempts per account per quarter hour: enough for a mistyped password on
 * a busy ward, far too few to guess one.
 *
 * Both are resolved per request rather than read at import time, so a value in
 * `.env` is picked up — ConfigModule has not populated process.env yet when
 * this file is first loaded. A test or CI environment can raise the limit
 * without weakening the shipped default, because the whole suite signs in as
 * one account.
 */
const loginLimit = () => Number(process.env.LOGIN_RATE_LIMIT ?? 10);
const loginTtlMs = () => Number(process.env.LOGIN_RATE_TTL_MS ?? 15 * 60_000);

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: loginLimit, ttl: loginTtlMs } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = (req.headers["x-forwarded-for"] as string) ?? req.ip;
    return this.authService.login(dto, ip, req.headers["user-agent"]);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body("refreshToken") token: string) {
    return this.authService.refreshTokens(token);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body("refreshToken") token: string) {
    await this.authService.logout(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post("mfa/setup")
  setupMfa(@CurrentUser() user: JwtPayload) {
    return this.authService.setupMfa(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("mfa/enable")
  @HttpCode(HttpStatus.NO_CONTENT)
  async enableMfa(@CurrentUser() user: JwtPayload, @Body("code") code: string) {
    await this.authService.enableMfa(user.sub, code);
  }
}
