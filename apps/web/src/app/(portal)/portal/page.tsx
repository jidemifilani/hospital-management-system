"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck, FlaskConical, Pill, CreditCard,
  User, Heart, AlertTriangle, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { portalApi, getPortalPatient } from "@/lib/portal-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const NAV = [
  { href: "/portal/appointments", icon: CalendarCheck, label: "My Appointments", color: "bg-blue-500" },
  { href: "/portal/results",      icon: FlaskConical,  label: "Lab Results",      color: "bg-violet-500" },
  { href: "/portal/prescriptions",icon: Pill,          label: "Prescriptions",    color: "bg-green-500" },
  { href: "/portal/bills",        icon: CreditCard,    label: "Bills & Payments", color: "bg-amber-500" },
];

export default function PortalHomePage() {
  const router = useRouter();
  const [patient, setPatient] = useState<ReturnType<typeof getPortalPatient>>(null);

  useEffect(() => {
    const p = getPortalPatient();
    if (!p) { router.replace("/portal/login"); return; }
    setPatient(p);
  }, [router]);

  const { data: summary } = useQuery({
    queryKey: ["portal-health-summary"],
    queryFn: () => portalApi.get("/portal/health-summary").then((r) => r.data),
    enabled: !!patient,
  });

  const { data: upcomingAppts } = useQuery({
    queryKey: ["portal-appointments"],
    queryFn: () => portalApi.get("/portal/appointments?limit=3").then((r) => r.data.items),
    enabled: !!patient,
  });

  if (!patient) return null;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
        <p className="text-sm opacity-80">Welcome back</p>
        <h1 className="mt-1 text-2xl font-bold">{patient.name}</h1>
        <p className="mt-1 text-sm opacity-70">MRN: {patient.mrn} · {patient.gender}</p>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {NAV.map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium">{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Upcoming Appointments</CardTitle>
            <Link href="/portal/appointments" className="text-xs text-primary flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {!upcomingAppts || upcomingAppts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
            ) : upcomingAppts
                .filter((a: any) => new Date(a.scheduledAt) >= new Date())
                .slice(0, 3)
                .map((appt: any) => (
              <div key={appt.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {appt.doctor ? `Dr. ${appt.doctor.lastName}` : appt.department?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(appt.scheduledAt)}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{appt.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Latest vitals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />Latest Vitals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!summary?.latestVitals ? (
              <p className="text-sm text-muted-foreground">No vitals recorded yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {summary.latestVitals.systolicBP && (
                  <div><p className="text-xs text-muted-foreground">Blood Pressure</p>
                  <p className="font-semibold">{summary.latestVitals.systolicBP}/{summary.latestVitals.diastolicBP} mmHg</p></div>
                )}
                {summary.latestVitals.heartRate && (
                  <div><p className="text-xs text-muted-foreground">Heart Rate</p>
                  <p className="font-semibold">{summary.latestVitals.heartRate} bpm</p></div>
                )}
                {summary.latestVitals.temperature && (
                  <div><p className="text-xs text-muted-foreground">Temperature</p>
                  <p className="font-semibold">{summary.latestVitals.temperature}°C</p></div>
                )}
                {summary.latestVitals.oxygenSaturation && (
                  <div><p className="text-xs text-muted-foreground">SpO₂</p>
                  <p className="font-semibold">{summary.latestVitals.oxygenSaturation}%</p></div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active diagnoses */}
        {summary?.diagnoses?.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />Active Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {summary.diagnoses
                  .filter((d: any) => d.status === "ACTIVE")
                  .map((d: any, i: number) => (
                    <Badge key={d.icdCode ?? i} variant="secondary">
                      {d.icdCode ? `${d.icdCode} — ` : ""}{d.description}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
