"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { api } from "@/lib/api-client";

type ApptStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

interface TodayAppointment {
  id: string;
  scheduledAt: string;
  status: ApptStatus;
  type: string;
  patient: { mrn: string; firstName: string; lastName: string };
  doctor: { firstName: string; lastName: string } | null;
  department: { name: string } | null;
}

const STATUS_VARIANT: Record<ApptStatus, "default" | "secondary" | "destructive" | "outline"> = {
  SCHEDULED: "outline",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "secondary",
};

export function AppointmentsToday() {
  const { data = [], isError } = useQuery<TodayAppointment[]>({
    queryKey: ["appointments-today"],
    queryFn: () => api.get("/dashboard/today-appointments").then((r) => r.data),
    refetchInterval: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Today&apos;s Appointments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isError && (
          <p className="text-sm text-destructive">Failed to load appointments.</p>
        )}
        {!isError && data.length === 0 && (
          <p className="text-sm text-muted-foreground">No appointments scheduled for today.</p>
        )}
        {data.slice(0, 6).map((appt) => (
          <div key={appt.id} className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {appt.patient.firstName} {appt.patient.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {appt.type}{appt.doctor ? ` · Dr. ${appt.doctor.lastName}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(appt.scheduledAt)}</p>
            </div>
            <Badge variant={STATUS_VARIANT[appt.status]}>{appt.status.replace("_", " ")}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
