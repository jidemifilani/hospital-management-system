"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Repeat2, Plus, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const SHIFTS = ["MORNING","AFTERNOON","NIGHT"];
const today = format(new Date(), "yyyy-MM-dd");

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  ACKNOWLEDGED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export function HandoverPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [form, setForm] = useState({
    toStaffId: "", shiftType: "MORNING", departmentId: "",
    handoverDate: today, generalNotes: "", pendingTasks: "",
  });

  const params = new URLSearchParams({ date });
  if (statusFilter !== "all") params.set("status", statusFilter);

  const { data: handovers = [] } = useQuery({
    queryKey: ["handover", date, statusFilter],
    queryFn: () => api.get(`/handover?${params}`).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["handover-summary"],
    queryFn: () => api.get("/handover/summary").then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["handover"] });
    qc.invalidateQueries({ queryKey: ["handover-summary"] });
  };

  const create = useMutation({
    mutationFn: (data: any) => api.post("/handover", data).then((r) => r.data),
    onSuccess: () => { invalidate(); setAddOpen(false); setForm({ toStaffId: "", shiftType: "MORNING", departmentId: "", handoverDate: today, generalNotes: "", pendingTasks: "" }); },
  });

  const acknowledge = useMutation({
    mutationFn: (id: string) => api.patch(`/handover/${id}/acknowledge`, {}).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); },
  });

  const openSheet = (h: any) => { setSelected(h); setSheetOpen(true); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Repeat2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Shift Handover</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Handover</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Shift Handover</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Receiving Staff ID</Label>
                  <Input value={form.toStaffId} onChange={(e) => setForm({ ...form, toStaffId: e.target.value })} placeholder="To staff ID" />
                </div>
                <div className="space-y-1">
                  <Label>Department ID</Label>
                  <Input value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} placeholder="Department ID" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Shift</Label>
                  <Select value={form.shiftType} onValueChange={(v) => setForm({ ...form, shiftType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SHIFTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={form.handoverDate} onChange={(e) => setForm({ ...form, handoverDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>General Notes</Label>
                <Textarea rows={3} value={form.generalNotes} onChange={(e) => setForm({ ...form, generalNotes: e.target.value })} placeholder="Ward status, key events, patient concerns…" />
              </div>
              <div className="space-y-1">
                <Label>Pending Tasks</Label>
                <Textarea rows={2} value={form.pendingTasks} onChange={(e) => setForm({ ...form, pendingTasks: e.target.value })} placeholder="Outstanding tasks for incoming shift…" />
              </div>
              <Button className="w-full" onClick={() => create.mutate(form)} disabled={create.isPending || !form.toStaffId || !form.departmentId}>
                Submit Handover
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Today's Handovers", value: summary.todayTotal, color: "text-primary" },
            { label: "Pending Acknowledgement", value: summary.pending, color: "text-orange-600" },
            { label: "Acknowledged", value: summary.acknowledged, color: "text-green-600" },
            { label: "Total All Time", value: summary.total, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3"><p className={`text-2xl font-bold ${color}`}>{value}</p></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Handover #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {handovers.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No handovers found</TableCell></TableRow>
            ) : handovers.map((h: any) => (
              <TableRow key={h.id} className={h.status === "SUBMITTED" ? "bg-blue-50/30 dark:bg-blue-950/10" : ""}>
                <TableCell className="font-mono text-xs">{h.handoverNumber}</TableCell>
                <TableCell className="text-sm">{format(new Date(h.handoverDate), "dd MMM yyyy")}</TableCell>
                <TableCell><Badge variant="outline">{h.shiftType}</Badge></TableCell>
                <TableCell className="text-sm">{h.department?.name ?? "—"}</TableCell>
                <TableCell className="text-sm">{h.fromStaff ? `${h.fromStaff.firstName} ${h.fromStaff.lastName}` : "—"}</TableCell>
                <TableCell className="text-sm">{h.toStaff ? `${h.toStaff.firstName} ${h.toStaff.lastName}` : "—"}</TableCell>
                <TableCell><Badge className={statusColors[h.status] ?? ""}>{h.status}</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => openSheet(h)}>View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Repeat2 className="h-5 w-5" />
                  {selected.handoverNumber}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{format(new Date(selected.handoverDate), "dd MMM yyyy")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Shift</span><Badge variant="outline">{selected.shiftType}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span>{selected.department?.name ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">From</span><span>{selected.fromStaff?.firstName} {selected.fromStaff?.lastName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">To</span><span>{selected.toStaff?.firstName} {selected.toStaff?.lastName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[selected.status] ?? ""}>{selected.status}</Badge></div>
                  {selected.acknowledgedAt && <div className="flex justify-between"><span className="text-muted-foreground">Acknowledged</span><span>{format(new Date(selected.acknowledgedAt), "HH:mm dd MMM")}</span></div>}
                </div>

                {selected.generalNotes && (
                  <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">General Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{selected.generalNotes}</p>
                  </div>
                )}

                {selected.pendingTasks && (
                  <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Clock className="h-3 w-3" />Pending Tasks</p>
                    <p className="text-sm whitespace-pre-wrap">{selected.pendingTasks}</p>
                  </div>
                )}

                {selected.status === "SUBMITTED" && (
                  <Button className="w-full" size="sm" onClick={() => acknowledge.mutate(selected.id)} disabled={acknowledge.isPending}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />Acknowledge Handover
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
