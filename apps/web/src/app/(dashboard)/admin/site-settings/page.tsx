import type { Metadata } from "next";
import { SiteSettingsEditor } from "@/components/admin/site-settings-editor";

export const metadata: Metadata = { title: "Website Settings" };

export default function SiteSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Website Settings</h1>
        <p className="text-muted-foreground">
          Edit the public-facing website content, hero slider, team profiles, and theme colours.
        </p>
      </div>
      <SiteSettingsEditor />
    </div>
  );
}
