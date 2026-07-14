"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Loader2, Video } from "lucide-react";
import { portalApi } from "@/lib/portal-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  NO_SHOW: "bg-red-100 text-red-700",
};

export default function PortalAppointmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-appointments-list"],
    queryFn: () => portalApi.get("/portal/appointments?limit=50").then((r) => r.data),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">My Appointments</h1>
        <p className="text-sm text-muted-foreground">Your full appointment history</p>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <div className="space-y-3">
        {items.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">No appointments found.</p>
        )}
        {items.map((appt: any) => (
          <Card key={appt.id}>
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  {appt.isTelemedicine ? <Video className="h-5 w-5" /> : <CalendarCheck className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : "Appointment"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {appt.department?.name} · {appt.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(appt.scheduledAt)}</p>
                  {appt.chiefComplaint && (
                    <p className="text-xs text-muted-foreground mt-1 italic">"{appt.chiefComplaint}"</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[appt.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {appt.status.replace("_", " ")}
                </span>
                {appt.isTelemedicine && appt.meetingUrl && appt.status === "CONFIRMED" && (
                  <Button size="sm" className="h-7 text-xs" asChild>
                    <a href={appt.meetingUrl} target="_blank" rel="noopener noreferrer">
                      <Video className="mr-1 h-3 w-3" />Join Call
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
