import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { authenticator } from "otplib";
import * as qrcode from "qrcode";
import * as bcrypt from "bcrypt";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthResponse, JwtPayload, MfaSetupResponse } from "@hms/types";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@hms/config";
import { LoginDto } from "./dto/login.dto";

const genBackup = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 10);


@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { staff: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active");
    }

    if (user.mfaEnabled) {
      if (!dto.totpCode) {
        throw new UnauthorizedException("MFA_REQUIRED");
      }
      const valid = authenticator.verify({ token: dto.totpCode, secret: user.mfaSecret! });
      if (!valid) throw new UnauthorizedException("Invalid 2FA code");
    }

    const permissions = ROLE_PERMISSIONS[user.role] ?? [];
    // permissions are intentionally NOT signed into the token: they are a pure
    // function of role, and embedding ~100 of them pushed the session cookie
    // past the browser's 4KB limit, which silently dropped admin sessions.
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as any,
      staffId: user.staff?.id ?? null,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id, ip, userAgent);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.staff?.firstName ?? ""} ${user.staff?.lastName ?? ""}`.trim(),
        role: user.role as any,
        permissions,
        staffId: user.staff?.id ?? null,
      },
    };
  }

  async refreshTokens(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { staff: true } } },
    });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

    const permissions = ROLE_PERMISSIONS[stored.user.role] ?? [];
    const payload: JwtPayload = {
      sub: stored.user.id,
      email: stored.user.email,
      role: stored.user.role as any,
      staffId: stored.user.staff?.id ?? null,
      organizationId: stored.user.organizationId,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = await this.generateRefreshToken(stored.user.id);
    return { accessToken, refreshToken };
  }

  async logout(token: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { isRevoked: true },
    });
  }

  async setupMfa(userId: string): Promise<MfaSetupResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.mfaEnabled) throw new ConflictException("MFA is already enabled");

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, "CareSync HMS", secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauth);
    const backupCodes = Array.from({ length: 10 }, () => genBackup());

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaBackupCodes: backupCodes },
    });

    return { secret, qrCodeDataUrl, backupCodes };
  }

  async enableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) throw new BadRequestException("MFA setup not initiated");
    const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!valid) throw new BadRequestException("Invalid verification code");
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  }

  private async generateRefreshToken(userId: string, ip?: string, userAgent?: string): Promise<string> {
    const { customAlphabet: ca } = await import("nanoid");
    const gen = ca("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 64);
    const token = gen();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt, ipAddress: ip, userAgent },
    });
    return token;
  }
}
