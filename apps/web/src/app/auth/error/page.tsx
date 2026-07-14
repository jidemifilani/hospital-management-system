import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Authentication Error" };

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const messages: Record<string, string> = {
    CredentialsSignin: "Invalid email or password.",
    SessionRequired: "You must be signed in to access this page.",
    Default: "An unexpected authentication error occurred.",
  };

  const message = messages[searchParams.error ?? "Default"] ?? messages["Default"];

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Sign-in failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button asChild>
          <Link href="/auth/login">Back to Sign In</Link>
        </Button>
      </div>
    </main>
  );
}
