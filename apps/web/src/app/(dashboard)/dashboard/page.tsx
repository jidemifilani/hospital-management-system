import type { Metadata } from "next";
import { DashboardStats } from "@/components/dashboard/stats";
import { AppointmentsToday } from "@/components/dashboard/appointments-today";
import { RecentPatients } from "@/components/dashboard/recent-patients";
import { BedOccupancy } from "@/components/dashboard/bed-occupancy";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here&apos;s what&apos;s happening today.</p>
      </div>
      <DashboardStats />
      <div className="grid gap-6 lg:grid-cols-2">
        <AppointmentsToday />
        <RecentPatients />
      </div>
      <BedOccupancy />
    </div>
  );
}
