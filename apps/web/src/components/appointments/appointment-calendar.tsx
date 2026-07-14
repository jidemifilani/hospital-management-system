"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, User, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/api-client";
import { AppointmentActions } from "./appointment-actions";

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  scheduledAt: string;
  status: string;
  type: string;
  chiefComplaint?: string;
  durationMinutes?: number;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-gray-100 text-gray-700",
};

export function AppointmentCalendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<Appointment | null>(null);
  const weekEnd = addDays(weekStart, 6);

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["appointments", format(weekStart, "yyyy-MM-dd")],
    queryFn: () =>
      api
        .get("/appointments", {
          params: {
            from: format(weekStart, "yyyy-MM-dd"),
            to: format(weekEnd, "yyyy-MM-dd"),
            limit: 200,
          },
        })
        .then((r) => r.data.items),
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDay = (day: Date) =>
    appointments.filter(
      (a) => format(new Date(a.scheduledAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
    );

  return (
    <>
    <Card>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 divide-x">
          {days.map((day) => {
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            const dayAppts = byDay(day);
            return (
              <div key={day.toISOString()} className="min-h-48 p-2">
                <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  <div>
                    <div className="text-center">{format(day, "EEE")}</div>
                    <div className="text-center">{format(day, "d")}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {dayAppts.map((a) => (
                    <div
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setSelected(a)}
                      onClick={() => setSelected(a)}
                      className={`cursor-pointer rounded p-1 text-xs hover:opacity-80 ${STATUS_COLORS[a.status] ?? "bg-primary/10"}`}
                    >
                      <p className="truncate font-medium">{a.patientName}</p>
                      <p className="truncate opacity-75">{format(new Date(a.scheduledAt), "HH:mm")} · {a.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    {/* Appointment detail sheet */}
    <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
      <SheetContent className="w-full sm:max-w-md">
        {selected && (
          <>
            <SheetHeader>
              <SheetTitle>Appointment Details</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="font-medium">{selected.patientName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Doctor</p>
                  <p className="font-medium">{selected.doctorName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {format(new Date(selected.scheduledAt), "EEEE, dd MMM yyyy 'at' HH:mm")}
                  </p>
                  {selected.durationMinutes && (
                    <p className="text-xs text-muted-foreground">{selected.durationMinutes} min</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[selected.status]}>{selected.status}</Badge>
                <Badge variant="outline">{selected.type}</Badge>
              </div>
              {selected.chiefComplaint && (
                <div>
                  <p className="text-xs text-muted-foreground">Chief Complaint</p>
                  <p className="mt-1 text-sm">{selected.chiefComplaint}</p>
                </div>
              )}
              <div className="border-t pt-4">
                <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Actions
                </p>
                <AppointmentActions
                  appointmentId={selected.id}
                  status={selected.status}
                  onUpdate={() => setSelected(null)}
                />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}
