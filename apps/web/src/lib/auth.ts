import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

async function serverPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
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
          return null;
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
