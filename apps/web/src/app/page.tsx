import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PublicNav } from "@/components/public/nav";
import { PublicFooter } from "@/components/public/footer";
import { PublicHomePage, type SiteSettings } from "@/components/public/home-page";

async function fetchSiteSettings(): Promise<SiteSettings | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const res = await fetch(`${apiUrl}/api/v1/site-settings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Root "/" — logged-in staff go to /dashboard; guests see the public website.
export default async function RootPage() {
  const [session, settings] = await Promise.all([
    getServerSession(authOptions),
    fetchSiteSettings(),
  ]);
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="flex-1">
        <PublicHomePage settings={settings} />
      </main>
      <PublicFooter />
    </div>
  );
}

