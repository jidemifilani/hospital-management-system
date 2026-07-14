"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CalendarClock, Activity, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const STATUS_OPTIONS = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "POSTPONED"];
const URGENCY_OPTIONS = ["ELECTIVE", "URGENT", "EMERGENCY"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    POSTPONED: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status.replace(/_/g, " ")}</Badge>;
}

function urgencyBadge(urgency: string) {
  const map: Record<string, string> = {
    ELECTIVE: "bg-gray-100 text-gray-800",
    URGENT: "bg-yellow-100 text-yellow-800",
    EMERGENCY: "bg-red-100 text-red-800",
  };
  return <Badge className={map[urgency] ?? "bg-gray-100 text-gray-800"}>{urgency}</Badge>;
}

function BookSurgeryDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: "", surgeonId: "", anaesthesiologistId: "", procedureName: "",
    scheduledDate: "", scheduledDuration: "60", operatingRoom: "", urgency: "ELECTIVE",
    preOpNotes: "", anaesthesiaType: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/theatre", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Book Theatre</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Book Operating Theatre</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Patient ID</Label>
              <Input value={form.patientId} onChange={f("patientId")} placeholder="Patient ID" />
            </div>
            <div className="space-y-1">
              <Label>Surgeon ID</Label>
              <Input value={form.surgeonId} onChange={f("surgeonId")} placeholder="Staff ID" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Procedure Name</Label>
            <Input value={form.procedureName} onChange={f("procedureName")} placeholder="e.g. Appendectomy" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Scheduled Date & Time</Label>
              <Input value={form.scheduledDate} onChange={f("scheduledDate")} type="datetime-local" />
            </div>
            <div className="space-y-1">
              <Label>Duration (min)</Label>
              <Input value={form.scheduledDuration} onChange={f("scheduledDuration")} type="number" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Operating Room</Label>
              <Input value={form.operatingRoom} onChange={f("operatingRoom")} placeholder="e.g. OT-1" />
            </div>
            <div className="space-y-1">
              <Label>Urgency</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{URGENCY_OPTIONS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Anaesthesiologist ID (optional)</Label>
            <Input value={form.anaesthesiologistId} onChange={f("anaesthesiologistId")} placeholder="Staff ID" />
          </div>
          <div className="space-y-1">
            <Label>Anaesthesia Type</Label>
            <Input value={form.anaesthesiaType} onChange={f("anaesthesiaType")} placeholder="e.g. General, Spinal" />
          </div>
          <div className="space-y-1">
            <Label>Pre-op Notes</Label>
            <Textarea value={form.preOpNotes} onChange={f("preOpNotes")} rows={3} />
          </div>
          <Button
            className="w-full"
            disabled={!form.patientId || !form.surgeonId || !form.procedureName || !form.scheduledDate || mutation.isPending}
            onClick={() => mutation.mutate({ ...form, scheduledDuration: Number(form.scheduledDuration) })}
          >
            {mutation.isPending ? "Booking..." : "Book Theatre"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UpdateStatusDialog({ booking, onSuccess }: { booking: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    status: booking.status,
    actualStartTime: "", actualEndTime: "", postOpNotes: "", complications: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.patch(`/theatre/${booking.id}/status`, data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2">Update</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{booking.bookingNumber} — Update</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Procedure: <span className="font-medium text-foreground">{booking.procedureName}</span></p>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {(form.status === "IN_PROGRESS" || form.status === "COMPLETED") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Actual Start</Label>
                <Input value={form.actualStartTime} onChange={(e) => setForm({ ...form, actualStartTime: e.target.value })} type="datetime-local" />
              </div>
              <div className="space-y-1">
                <Label>Actual End</Label>
                <Input value={form.actualEndTime} onChange={(e) => setForm({ ...form, actualEndTime: e.target.value })} type="datetime-local" />
              </div>
            </div>
          )}
          {form.status === "COMPLETED" && (
            <>
              <div className="space-y-1">
                <Label>Post-op Notes</Label>
                <Textarea value={form.postOpNotes} onChange={(e) => setForm({ ...form, postOpNotes: e.target.value })} rows={3} />
              </div>
              <div className="space-y-1">
                <Label>Complications</Label>
                <Input value={form.complications} onChange={(e) => setForm({ ...form, complications: e.target.value })} placeholder="None" />
              </div>
            </>
          )}
          <Button className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate(form)}>
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TheatrePage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: summary } = useQuery({
    queryKey: ["theatre-summary"],
    queryFn: () => api.get("/theatre/summary").then((r) => r.data),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["theatre-bookings", statusFilter],
    queryFn: () => api.get("/theatre", { params: statusFilter !== "ALL" ? { status: statusFilter } : {} }).then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["theatre-bookings"] });
    qc.invalidateQueries({ queryKey: ["theatre-summary"] });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Theatre Management</h1>
          <p className="text-muted-foreground">Surgical bookings and operating theatre schedule</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Surgeries</CardTitle>
            <CalendarClock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.today ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.scheduled ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{summary?.inProgress ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.completed ?? 0}</div></CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <BookSurgeryDialog onSuccess={invalidate} />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Procedure</TableHead>
                <TableHead>Surgeon</TableHead>
                <TableHead>OT</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No bookings found</TableCell></TableRow>
              )}
              {bookings.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.bookingNumber}</TableCell>
                  <TableCell>{b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : "—"}</TableCell>
                  <TableCell className="font-medium">{b.procedureName}</TableCell>
                  <TableCell>{b.surgeon ? `Dr. ${b.surgeon.lastName}` : "—"}</TableCell>
                  <TableCell>{b.operatingRoom ?? "—"}</TableCell>
                  <TableCell className="text-sm">{format(new Date(b.scheduledDate), "dd MMM yyyy HH:mm")}</TableCell>
                  <TableCell>{b.scheduledDuration} min</TableCell>
                  <TableCell>{urgencyBadge(b.urgency)}</TableCell>
                  <TableCell>{statusBadge(b.status)}</TableCell>
                  <TableCell><UpdateStatusDialog booking={b} onSuccess={invalidate} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
