"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  UserCheck, UserX, Clock, CalendarDays, Download, Loader2, CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { exportToCsv } from "@/lib/csv-export";

interface AttendanceRecord {
  id: string; status: string; date: string; clockIn?: string; clockOut?: string; notes?: string;
  staff: { id: string; firstName: string; lastName: string; employeeId: string; department: { name: string } };
}

interface Summary { present: number; absent: number; late: number; halfDay: number; onLeave: number; totalStaff: number }
interface Department { id: string; name: string }

const STATUS_COLOR: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  LATE: "bg-amber-100 text-amber-700",
  HALF_DAY: "bg-blue-100 text-blue-700",
  ON_LEAVE: "bg-purple-100 text-purple-700",
};

function RecordDialog({
  open, onClose, onSuccess,
}: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ staffSearch: "", staffId: "", date: format(new Date(), "yyyy-MM-dd"), status: "PRESENT", notes: "" });
  const { toast } = useToast();

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["staff-search-att", form.staffSearch],
    queryFn: () => api.get(`/staff?search=${encodeURIComponent(form.staffSearch)}&limit=6`).then((r) => r.data.data ?? r.data),
    enabled: form.staffSearch.length >= 2,
  });

  const record = useMutation({
    mutationFn: () => api.post("/attendance/record", { staffId: form.staffId, date: form.date, status: form.status, notes: form.notes || undefined }),
    onSuccess: () => { toast({ title: "Attendance recorded" }); onSuccess(); onClose(); },
    onError: (e: any) => toast({ title: apiErrorMessage(e, "Failed"), variant: "destructive" }),
  });

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Record Attendance</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Search Staff *</Label>
            <Input className="mt-1" placeholder="Name or employee ID…" value={form.staffSearch} onChange={(e) => f("staffSearch", e.target.value)} />
            {staff.length > 0 && !form.staffId && (
              <div className="mt-1 rounded-lg border shadow-sm bg-white">
                {staff.map((s: any) => (
                  <button key={s.id} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60 flex justify-between"
                    onClick={() => { f("staffId", s.id); f("staffSearch", `${s.firstName} ${s.lastName} (${s.employeeId})`); }}>
                    <span>{s.firstName} {s.lastName}</span>
                    <span className="text-xs text-muted-foreground">{s.employeeId}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Date *</Label>
            <Input type="date" className="mt-1" value={form.date} onChange={(e) => f("date", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Status *</Label>
            <Select value={form.status} onValueChange={(v) => f("status", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["PRESENT", "ABSENT", "LATE", "HALF_DAY", "ON_LEAVE"].map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input className="mt-1" value={form.notes} onChange={(e) => f("notes", e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => record.mutate()} disabled={record.isPending || !form.staffId}>
            {record.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AttendancePage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [deptFilter, setDeptFilter] = useState("");
  const [showRecord, setShowRecord] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: summary } = useQuery<Summary>({
    queryKey: ["attendance-summary", date],
    queryFn: () => api.get("/attendance/summary", { params: { date } }).then((r) => r.data),
  });

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance", date, deptFilter],
    queryFn: () => api.get("/attendance", { params: { date, ...(deptFilter ? { departmentId: deptFilter } : {}) } }).then((r) => r.data),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments-list"],
    queryFn: () => api.get("/departments").then((r) => r.data.data ?? r.data),
  });

  const clockIn = useMutation({
    mutationFn: () => api.post("/attendance/clock-in"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); toast({ title: "Clocked in" }); },
    onError: (e: any) => toast({ title: apiErrorMessage(e, "Failed"), variant: "destructive" }),
  });

  const clockOut = useMutation({
    mutationFn: () => api.post("/attendance/clock-out"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); toast({ title: "Clocked out" }); },
    onError: (e: any) => toast({ title: apiErrorMessage(e, "Failed"), variant: "destructive" }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["attendance"] });

  const handleExport = () => {
    exportToCsv("attendance-" + date, records.map((r) => ({
      "Employee ID": r.staff.employeeId,
      "Name": `${r.staff.firstName} ${r.staff.lastName}`,
      "Department": r.staff.department.name,
      "Status": r.status,
      "Clock In": r.clockIn ? format(new Date(r.clockIn), "HH:mm") : "",
      "Clock Out": r.clockOut ? format(new Date(r.clockOut), "HH:mm") : "",
      "Notes": r.notes ?? "",
    })));
  };

  const KPI = [
    { label: "Present", value: summary?.present ?? 0, icon: UserCheck, color: "text-green-600" },
    { label: "Absent", value: summary?.absent ?? 0, icon: UserX, color: "text-red-600" },
    { label: "Late", value: summary?.late ?? 0, icon: Clock, color: "text-amber-600" },
    { label: "On Leave", value: summary?.onLeave ?? 0, icon: CalendarDays, color: "text-purple-600" },
  ];

  const attendanceRate = summary && summary.totalStaff > 0
    ? Math.round(((summary.present + summary.late + summary.halfDay) / summary.totalStaff) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Staff daily attendance tracking.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => clockIn.mutate()} disabled={clockIn.isPending}>
            <CheckCircle2 className="mr-2 h-4 w-4" />Clock In
          </Button>
          <Button variant="outline" size="sm" onClick={() => clockOut.mutate()} disabled={clockOut.isPending}>
            <Clock className="mr-2 h-4 w-4" />Clock Out
          </Button>
          <Button size="sm" onClick={() => setShowRecord(true)}>Record</Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {attendanceRate !== null && (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-sm">Attendance rate today:</p>
          <span className={`text-lg font-bold ${attendanceRate >= 90 ? "text-green-600" : attendanceRate >= 70 ? "text-amber-600" : "text-red-600"}`}>
            {attendanceRate}%
          </span>
          <span className="text-xs text-muted-foreground">{((summary?.present ?? 0) + (summary?.late ?? 0) + (summary?.halfDay ?? 0))} of {summary?.totalStaff ?? 0} staff</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All departments</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={records.length === 0}>
          <Download className="mr-2 h-4 w-4" />Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-muted" /></TableCell>
                  ))}</TableRow>
                ))
              : records.length === 0
              ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No records for this date.</TableCell></TableRow>
              : records.map((r) => {
                  const hours = r.clockIn && r.clockOut
                    ? ((new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 3600000).toFixed(1)
                    : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{r.staff.firstName} {r.staff.lastName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.staff.employeeId}</p>
                      </TableCell>
                      <TableCell className="text-sm">{r.staff.department.name}</TableCell>
                      <TableCell><Badge className={STATUS_COLOR[r.status] ?? "bg-gray-100"}>{r.status.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-sm font-mono">{r.clockIn ? format(new Date(r.clockIn), "HH:mm") : "—"}</TableCell>
                      <TableCell className="text-sm font-mono">{r.clockOut ? format(new Date(r.clockOut), "HH:mm") : "—"}</TableCell>
                      <TableCell className="text-sm">{hours ? `${hours}h` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-32 truncate">{r.notes ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {showRecord && (
        <RecordDialog open onClose={() => setShowRecord(false)} onSuccess={refresh} />
      )}
    </div>
  );
}
