import type { Metadata } from "next";
import { Suspense } from "react";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Appointments" };

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Schedule and manage patient appointments.</p>
        </div>
        <Button asChild>
          <Link href="/appointments/new">
            <CalendarPlus className="mr-2 h-4 w-4" />
            Book Appointment
          </Link>
        </Button>
      </div>
      <Suspense fallback={<div>Loading calendar…</div>}>
        <AppointmentCalendar />
      </Suspense>
    </div>
  );
}
