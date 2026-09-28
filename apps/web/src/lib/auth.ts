import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

/** Carries the status so callers can tell "wrong password" from "API is down". */
class ApiCallError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function serverPost<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // The API was unreachable — a restart, a dropped connection. This is not
    // a credentials problem and must not be reported as one.
    throw new ApiCallError("Unreachable", 0);
  }

  // An error page or an empty body is not JSON; treat that as a server fault
  // rather than letting the parse failure masquerade as a rejected login.
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const raw = json?.message;
    const msg = Array.isArray(raw) ? raw.join(", ") : (raw ?? `HTTP ${res.status}`);
    throw new ApiCallError(msg, res.status);
  }
  if (!json) throw new ApiCallError("Malformed response", res.status);
  return json as T;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      accessToken: string;
    };
    /** Set when the access token could not be refreshed; sign in again. */
    error?: string;
  }
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    accessToken: string;
    refreshToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    error?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        try {
          const data = await serverPost<{
            user: User;
            accessToken: string;
            refreshToken: string;
          }>("/auth/login", {
            email: credentials.email,
            password: credentials.password,
            ...(credentials.totpCode?.length === 6 ? { totpCode: credentials.totpCode } : {}),
          });
          return {
            ...data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "";
          if (message === "MFA_REQUIRED") throw new Error("MFA_REQUIRED");

          const status = err instanceof ApiCallError ? err.status : 0;

          // Only a rejected credential is a credentials problem. Returning
          // null for everything else told a nurse whose server had restarted
          // that their password was wrong, and sent them to reset it.
          if (status === 429) throw new Error("TOO_MANY_ATTEMPTS");
          if (status === 401 || status === 403) return null;
          throw new Error("SERVICE_UNAVAILABLE");
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = Date.now() + 15 * 60 * 1000;
      }

      if (Date.now() < token.accessTokenExpires) return token;

      // Access token expired — refresh it
      try {
        const data = await serverPost<{ accessToken: string; refreshToken: string }>(
          "/auth/refresh",
          { refreshToken: token.refreshToken },
        );
        token.accessToken = data.accessToken;
        token.refreshToken = data.refreshToken;
        token.accessTokenExpires = Date.now() + 15 * 60 * 1000;
      } catch {
        // Refresh failed — force re-login
        return { ...token, error: "RefreshAccessTokenError" };
      }

      return token;
    },

    async session({ session, token }) {
      // A token whose refresh failed still carries an id, a role and a stale
      // access token. Copying those through left the app looking signed in
      // while every API call behind it returned 401 — an empty dashboard with
      // no prompt to sign in again. Surfacing the error lets the client act.
      if (token.error) {
        return { ...session, error: token.error, user: undefined as never };
      }
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.accessToken = token.accessToken;
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8h

  secret: process.env.NEXTAUTH_SECRET,
};
