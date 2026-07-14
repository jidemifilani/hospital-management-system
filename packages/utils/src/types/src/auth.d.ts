import type { StaffRole } from "./enums";
export interface LoginDto {
    email: string;
    password: string;
    totpCode?: string;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: StaffRole;
    permissions: string[];
    staffId: string | null;
}
export interface AuthResponse extends TokenPair {
    user: AuthUser;
}
export interface JwtPayload {
    sub: string;
    email: string;
    role: StaffRole;
    permissions: string[];
    staffId: string | null;
    organizationId: string;
    iat?: number;
    exp?: number;
}
export interface MfaSetupResponse {
    secret: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
}
//# sourceMappingURL=auth.d.ts.map