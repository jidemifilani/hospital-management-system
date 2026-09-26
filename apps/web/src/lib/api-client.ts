import axios from "axios";
import { getSession } from "next-auth/react";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const api = axios.create({
  baseURL: `${apiBase}/api/v1`,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// Attach auth token for client-side requests
api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const session = await getSession();
    if (session?.user?.accessToken) {
      config.headers.Authorization = `Bearer ${session.user.accessToken}`;
    }
  }
  return config;
});

/** An API error that keeps the server's response body, not just its message. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Normalise error responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const raw = error.response?.data?.message;
    // class-validator returns an array of failures; flatten it into one line.
    const message = Array.isArray(raw)
      ? raw.join("; ")
      : (raw ?? error.message ?? "An unexpected error occurred");

    return Promise.reject(new ApiError(message, error.response?.status, error.response?.data));
  },
);
