"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Bell, Save, Loader2, Globe, Phone, Mail, MapPin, Image,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  notificationSettings: NotifSettings;
  createdAt: string;
}

interface NotifSettings {
  email: Record<string, boolean>;
  sms: Record<string, boolean>;
}

const NOTIF_EVENTS = [
  { key: "appointmentReminder", label: "Appointment Reminders", description: "Send reminders 24h and 1h before appointments" },
  { key: "invoiceCreated", label: "Invoice Created", description: "Notify patient when a new invoice is raised" },
  { key: "userCreated", label: "New Staff Account", description: "Send welcome email with credentials on account creation" },
  { key: "labResultReady", label: "Lab Results Ready", description: "Notify when lab results are verified" },
  { key: "leaveApproved", label: "Leave Approved/Rejected", description: "Notify staff when leave request is reviewed" },
] as const;

export function SettingsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<OrgSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const [orgForm, setOrgForm] = useState<Partial<OrgSettings>>({});
  const [notifForm, setNotifForm] = useState<NotifSettings | null>(null);

  const orgData = { ...settings, ...orgForm };
  const notifData: NotifSettings = notifForm ?? settings?.notificationSettings ?? { email: {}, sms: {} };

  const saveOrg = useMutation({
    mutationFn: () => api.patch("/settings/organization", orgForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setOrgForm({});
      toast({ title: "Organization profile saved" });
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Failed to save"), variant: "destructive" }),
  });

  const saveNotif = useMutation({
    mutationFn: () => api.patch("/settings/notifications", notifData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Notification preferences saved" });
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Failed to save"), variant: "destructive" }),
  });

  const setOrgField = (k: keyof OrgSettings, v: string) =>
    setOrgForm((p) => ({ ...p, [k]: v }));

  const toggleNotif = (channel: "email" | "sms", key: string, val: boolean) => {
    const base: NotifSettings = notifForm ?? settings?.notificationSettings ?? { email: {}, sms: {} };
    setNotifForm({
      ...base,
      [channel]: { ...base[channel], [key]: val },
    });
  };

  const isAdmin = ["SUPER_ADMIN", "HOSPITAL_ADMIN"].includes(session?.user?.role ?? "");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your organization profile and system preferences.</p>
      </div>

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">
            <Building2 className="mr-2 h-4 w-4" />Organization
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />Notifications
          </TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* ── Organization Profile ─────────────────────────────────────────── */}
        <TabsContent value="organization" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization Profile</CardTitle>
              <CardDescription>
                Hospital name and contact details shown on invoices, reports, and patient communications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Hospital / Organization Name</Label>
                  <Input
                    className="mt-1"
                    value={orgData.name ?? ""}
                    onChange={(e) => setOrgField("name", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="CareSync Hospital"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />Phone</Label>
                  <Input
                    className="mt-1"
                    value={orgData.phone ?? ""}
                    onChange={(e) => setOrgField("phone", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="+234 800 000 0000"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" />Email</Label>
                  <Input
                    className="mt-1"
                    type="email"
                    value={orgData.email ?? ""}
                    onChange={(e) => setOrgField("email", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="info@hospital.ng"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" />Website</Label>
                  <Input
                    className="mt-1"
                    value={orgData.website ?? ""}
                    onChange={(e) => setOrgField("website", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="https://hospital.ng"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Image className="h-3 w-3" />Logo URL</Label>
                  <Input
                    className="mt-1"
                    value={orgData.logoUrl ?? ""}
                    onChange={(e) => setOrgField("logoUrl", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="https://cdn.example.com/logo.png"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />Address</Label>
                  <Input
                    className="mt-1"
                    value={orgData.address ?? ""}
                    onChange={(e) => setOrgField("address", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="123 Hospital Road, Lagos"
                  />
                </div>
              </div>

              {orgData.logoUrl && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                  <img
                    src={orgData.logoUrl}
                    alt="Organization logo"
                    className="h-12 w-12 rounded object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <p className="text-sm text-muted-foreground">Logo preview</p>
                </div>
              )}

              {isAdmin ? (
                <Button
                  onClick={() => saveOrg.mutate()}
                  disabled={saveOrg.isPending || Object.keys(orgForm).length === 0}
                >
                  {saveOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />Save Changes
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Only administrators can edit the organization profile.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Organization ID</span>
                <span className="font-mono text-xs">{settings?.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono text-xs">{settings?.slug}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Created</span>
                <span>{settings?.createdAt ? new Date(settings.createdAt).toLocaleDateString() : "—"}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notification Preferences ─────────────────────────────────────── */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>
                Control which events trigger email and SMS notifications to patients and staff.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left font-medium text-muted-foreground">Event</th>
                      <th className="pb-3 w-24 text-center font-medium text-muted-foreground">Email</th>
                      <th className="pb-3 w-24 text-center font-medium text-muted-foreground">SMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {NOTIF_EVENTS.map(({ key, label, description }) => (
                      <tr key={key} className="border-b last:border-0">
                        <td className="py-4 pr-4">
                          <p className="font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </td>
                        <td className="py-4 text-center">
                          <Switch
                            checked={notifData.email?.[key] ?? true}
                            onCheckedChange={(v) => toggleNotif("email", key, v)}
                            disabled={!isAdmin}
                          />
                        </td>
                        <td className="py-4 text-center">
                          <Switch
                            checked={notifData.sms?.[key] ?? false}
                            onCheckedChange={(v) => toggleNotif("sms", key, v)}
                            disabled={!isAdmin}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAdmin ? (
                <Button
                  className="mt-6"
                  onClick={() => saveNotif.mutate()}
                  disabled={saveNotif.isPending || notifForm === null}
                >
                  {saveNotif.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />Save Preferences
                </Button>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">Only administrators can change notification preferences.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <TabsContent value="account" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{session?.user?.email ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="secondary">
                  {session?.user?.role?.replace(/_/g, " ").toLowerCase() ?? "—"}
                </Badge>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Name</span>
                <span>{session?.user?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Two-Factor Auth</span>
                <Badge variant="outline">
                  {(session?.user as any)?.mfaEnabled ? "Enabled" : "Not configured"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
