import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  // Someone sent here by an expired session needs to know that is what
  // happened; otherwise the sudden return to a login screen looks like a fault.
  const expired = searchParams?.error === "SessionExpired";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">CareSync HMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
        </div>
        {expired && (
          <div
            role="status"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            Your session expired and could not be renewed. Please sign in again.
          </div>
        )}
        <div className="rounded-2xl bg-card p-8 shadow-lg ring-1 ring-border">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
