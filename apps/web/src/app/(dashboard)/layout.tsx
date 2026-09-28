import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // A session carrying an error is one whose access token could not be
  // refreshed. It has no user, so it cannot render the shell, and its stale
  // token would 401 against every endpoint behind it — send them to sign in
  // again and say why, rather than showing an empty dashboard.
  if (!session || session.error || !session.user) {
    redirect(`/auth/login${session?.error ? "?error=SessionExpired" : ""}`);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar session={session} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
