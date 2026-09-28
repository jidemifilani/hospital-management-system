import { ApiError } from "./api-client";

/**
 * Pulls the reason out of a failed request.
 *
 * Screens used to reach for `err.response.data.message`, which is the raw axios
 * shape — but the API client's interceptor rejects with an ApiError that has
 * no `response` at all. Every one of them therefore discarded whatever the
 * server said and showed its own generic fallback, so a 400 explaining exactly
 * which field was wrong reached the user as "Failed to create department".
 *
 * The axios shape is still read as a fallback, in case anything bypasses the
 * shared client.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.message) return err.message;

  const raw = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(raw) && raw.length) return raw.join(", ");
  if (typeof raw === "string" && raw) return raw;

  const message = (err as { message?: string })?.message;
  return message && message !== "Network Error" ? message : fallback;
}
