"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfWeek, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface RosterEntry {
  id: string; date: string; shiftType: string; notes?: string;
  staff: { id: string; firstName: string; lastName: string; specialization?: string };
  department: { id: string; name: string };
}

const SHIFTS: { value: string; label: string; color: string }[] = [
  { value: "MORNING",   label: "Morning (07:00–15:00)",   color: "bg-sky-100 text-sky-700" },
  { value: "AFTERNOON", label: "Afternoon (15:00–23:00)", color: "bg-amber-100 text-amber-700" },
  { value: "NIGHT",     label: "Night (23:00–07:00)",     color: "bg-indigo-100 text-indigo-700" },
  { value: "ON_CALL",   label: "On Call",                 color: "bg-purple-100 text-purple-700" },
];

const SHIFT_COLORS: Record<string, string> = Object.fromEntries(SHIFTS.map((s) => [s.value, s.color]));

export function RosterPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const { data: roster = [], isLoading } = useQuery<RosterEntry[]>({
    queryKey: ["roster", from],
    queryFn: () => api.get("/roster/weekly", { params: { from } }).then((r) => r.data),
  });

  const deleteShift = useMutation({
    mutationFn: (id: string) => api.delete(`/roster/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roster"] }); toast({ title: "Shift removed" }); },
  });

  // group by staffId for the grid rows
  const staffMap = new Map<string, { name: string; dept: string; entries: Record<string, RosterEntry[]> }>();
  for (const entry of roster) {
    if (deptFilter !== "ALL" && entry.department.id !== deptFilter) continue;
    const key = entry.staff.id;
    if (!staffMap.has(key)) {
      staffMap.set(key, {
        name: `${entry.staff.firstName} ${entry.staff.lastName}`,
        dept: entry.department.name,
        entries: {},
      });
    }
    const dateKey = entry.date.slice(0, 10);
    const row = staffMap.get(key)!;
    row.entries[dateKey] = row.entries[dateKey] ?? [];
    row.entries[dateKey].push(entry);
  }

  const departments = Array.from(
    new Map(roster.map((r) => [r.department.id, r.department.name])).entries()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Roster</h1>
          <p className="text-sm text-muted-foreground">Weekly shift schedule.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />Assign Shift
        </Button>
      </div>

      {/* Week nav + dept filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setWeekStart((d) => addDays(d, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm font-medium">
            {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
          </span>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setWeekStart((d) => addDays(d, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {departments.length > 0 && (
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          This Week
        </Button>
      </div>

      {/* Roster Grid */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-40 px-4 py-3 text-left font-medium">Staff</th>
              {weekDays.map((day) => (
                <th key={day.toISOString()} className={`px-2 py-3 text-center font-medium ${isSameDay(day, new Date()) ? "bg-primary/10 text-primary" : ""}`}>
                  <div>{format(day, "EEE")}</div>
                  <div className="text-xs font-normal text-muted-foreground">{format(day, "d MMM")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-muted" /></td>
                  {weekDays.map((_, j) => <td key={j} className="px-2 py-3"><div className="h-8 animate-pulse rounded bg-muted" /></td>)}
                </tr>
              ))
            ) : staffMap.size === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  No shifts scheduled for this week.
                </td>
              </tr>
            ) : (
              Array.from(staffMap.entries()).map(([staffId, { name, dept, entries }]) => (
                <tr key={staffId} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{dept}</p>
                  </td>
                  {weekDays.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayEntries = entries[dateKey] ?? [];
                    return (
                      <td key={day.toISOString()} className="px-1.5 py-2 align-top">
                        <div className="space-y-1">
                          {dayEntries.map((e) => (
                            <div key={e.id} className={`group relative rounded-md px-2 py-1 text-xs ${SHIFT_COLORS[e.shiftType] ?? "bg-gray-100"}`}>
                              <span>{e.shiftType.replace("_"," ")}</span>
                              <button
                                onClick={() => deleteShift.mutate(e.id)}
                                className="absolute right-1 top-0.5 hidden group-hover:block text-red-500 hover:text-red-700"
                                title="Remove"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {SHIFTS.map((s) => (
          <div key={s.value} className="flex items-center gap-1.5 text-xs">
            <span className={`inline-block h-3 w-3 rounded ${s.color.split(" ")[0]}`} />
            <span>{s.label.split(" ")[0]}</span>
          </div>
        ))}
      </div>

      {showForm && (
        <AssignShiftDialog onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["roster"] }); }} />
      )}
    </div>
  );
}

// ── Assign Shift Dialog ────────────────────────────────────────────────────────
function AssignShiftDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [staffId, setStaffId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [shiftType, setShiftType] = useState("MORNING");
  const [notes, setNotes] = useState("");

  const { data: staffList = [] } = useQuery<{ id: string; firstName: string; lastName: string }[]>({
    queryKey: ["staff-list"],
    queryFn: () => api.get("/staff", { params: { limit: 100 } }).then((r) => r.data?.data ?? []),
  });

  const { data: deptList = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["dept-list"],
    queryFn: () => api.get("/departments").then((r) => r.data?.data ?? r.data),
  });

  const save = useMutation({
    mutationFn: () => api.post("/roster", { staffId, departmentId, date, shiftType, notes: notes || undefined }),
    onSuccess: () => { toast({ title: "Shift assigned" }); onSuccess(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? "Failed to assign shift", variant: "destructive" });
    },
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Assign Shift</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Staff Member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger><SelectValue placeholder="Select staff…" /></SelectTrigger>
              <SelectContent>
                {staffList.map((s) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue placeholder="Select department…" /></SelectTrigger>
              <SelectContent>
                {deptList.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Shift</Label>
              <Select value={shiftType} onValueChange={setShiftType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIFTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.value.replace("_"," ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input placeholder="e.g. Cover for leave" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!staffId || !departmentId || !date || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
