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
import { ClipboardPlus, Plus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const today = format(new Date(), "yyyy-MM-dd");

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-800",
};

export function WardRoundsPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");
  const [patientId, setPatientId] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({ findings: "", assessment: "", plan: "", notes: "" });
  const [completeOpen, setCompleteOpen] = useState(false);

  const [form, setForm] = useState({
    patientId: "", nurseId: "", roundDate: `${today}T08:00`,
    chiefComplaint: "", findings: "", assessment: "", plan: "", notes: "",
  });

  const params = new URLSearchParams({ date });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (patientId) params.set("patientId", patientId);

  const { data: rounds = [] } = useQuery({
    queryKey: ["ward-rounds", date, statusFilter, patientId],
    queryFn: () => api.get(`/ward-rounds?${params}`).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["ward-rounds-summary"],
    queryFn: () => api.get("/ward-rounds/summary").then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ward-rounds"] });
    qc.invalidateQueries({ queryKey: ["ward-rounds-summary"] });
  };

  const create = useMutation({
    mutationFn: (data: any) => api.post("/ward-rounds", data).then((r) => r.data),
    onSuccess: () => { invalidate(); setAddOpen(false); setForm({ patientId: "", nurseId: "", roundDate: `${today}T08:00`, chiefComplaint: "", findings: "", assessment: "", plan: "", notes: "" }); },
  });

  const complete = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/ward-rounds/${id}/complete`, data).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); setCompleteOpen(false); setCompleteForm({ findings: "", assessment: "", plan: "", notes: "" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/ward-rounds/${id}`, { status }).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); },
  });

  const openSheet = (r: any) => {
    setSelected(r);
    setSheetOpen(true);
    setCompleteForm({ findings: r.findings ?? "", assessment: r.assessment ?? "", plan: r.plan ?? "", notes: r.notes ?? "" });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardPlus className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Ward Rounds</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Round</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Start Ward Round</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Patient ID</Label>
                  <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Patient ID" />
                </div>
                <div className="space-y-1">
                  <Label>Nurse ID (optional)</Label>
                  <Input value={form.nurseId} onChange={(e) => setForm({ ...form, nurseId: e.target.value })} placeholder="Nurse staff ID" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Round Date/Time</Label>
                <Input type="datetime-local" value={form.roundDate} onChange={(e) => setForm({ ...form, roundDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Chief Complaint</Label>
                <Input value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} placeholder="Patient's presenting complaint" />
              </div>
              <div className="space-y-1">
                <Label>Findings</Label>
                <Textarea rows={2} value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} placeholder="Clinical findings on examination…" />
              </div>
              <div className="space-y-1">
                <Label>Assessment</Label>
                <Textarea rows={2} value={form.assessment} onChange={(e) => setForm({ ...form, assessment: e.target.value })} placeholder="Clinical assessment / impression…" />
              </div>
              <div className="space-y-1">
                <Label>Plan</Label>
                <Textarea rows={2} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="Management plan…" />
              </div>
              <Button className="w-full" onClick={() => create.mutate(form)} disabled={create.isPending || !form.patientId}>
                Create Round
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Pending", value: summary.pending, color: "text-yellow-600" },
            { label: "In Progress", value: summary.inProgress, color: "text-blue-600" },
            { label: "Completed Today", value: summary.completed, color: "text-green-600" },
            { label: "Today Total", value: summary.todayTotal, color: "text-primary" },
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
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Patient ID…" value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-44" />
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Round #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Nurse</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Chief Complaint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rounds.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No ward rounds found</TableCell></TableRow>
            ) : rounds.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.roundNumber}</TableCell>
                <TableCell className="text-sm">{r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : "—"}</TableCell>
                <TableCell className="text-sm">{r.attendingDoctor ? `${r.attendingDoctor.firstName} ${r.attendingDoctor.lastName}` : "—"}</TableCell>
                <TableCell className="text-sm">{r.nurse ? `${r.nurse.firstName} ${r.nurse.lastName}` : "—"}</TableCell>
                <TableCell className="text-sm">{format(new Date(r.roundDate), "HH:mm")}</TableCell>
                <TableCell className="text-sm max-w-[180px] truncate">{r.chiefComplaint ?? "—"}</TableCell>
                <TableCell><Badge className={statusColors[r.status] ?? ""}>{r.status.replace("_", " ")}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => openSheet(r)}>View</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[500px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <ClipboardPlus className="h-5 w-5" />{selected.roundNumber}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{selected.patient?.firstName} {selected.patient?.lastName}</span></div>
                  {selected.patient?.mrn && <div className="flex justify-between"><span className="text-muted-foreground">MRN</span><span className="font-mono">{selected.patient.mrn}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span>{selected.attendingDoctor?.firstName} {selected.attendingDoctor?.lastName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{format(new Date(selected.roundDate), "dd MMM yyyy HH:mm")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[selected.status] ?? ""}>{selected.status}</Badge></div>
                </div>

                {selected.chiefComplaint && <div className="rounded-lg border p-3 space-y-1"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chief Complaint</p><p className="text-sm">{selected.chiefComplaint}</p></div>}

                {/* Editable fields for findings/assessment/plan when not completed */}
                {selected.status !== "COMPLETED" && selected.status !== "CANCELLED" && (
                  <div className="space-y-3 rounded-lg border p-4">
                    {(["findings", "assessment", "plan", "notes"] as const).map((field) => (
                      <div key={field} className="space-y-1">
                        <Label className="capitalize text-xs">{field}</Label>
                        <Textarea rows={2} value={completeForm[field]} onChange={(e) => setCompleteForm({ ...completeForm, [field]: e.target.value })} placeholder={`${field.charAt(0).toUpperCase() + field.slice(1)}…`} />
                      </div>
                    ))}
                    <div className="flex gap-2">
                      {selected.status === "PENDING" && (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => updateStatus.mutate({ id: selected.id, status: "IN_PROGRESS" })} disabled={updateStatus.isPending}>Start</Button>
                      )}
                      <Button size="sm" className="flex-1" onClick={() => complete.mutate({ id: selected.id, data: completeForm })} disabled={complete.isPending}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />Complete
                      </Button>
                    </div>
                    <Button size="sm" variant="outline" className="w-full text-destructive" onClick={() => updateStatus.mutate({ id: selected.id, status: "CANCELLED" })} disabled={updateStatus.isPending}>Cancel</Button>
                  </div>
                )}

                {selected.status === "COMPLETED" && (
                  <div className="space-y-3 text-sm">
                    {[["Findings", selected.findings], ["Assessment", selected.assessment], ["Plan", selected.plan], ["Notes", selected.notes]].filter(([, v]) => v).map(([label, val]) => (
                      <div key={label} className="rounded-lg border p-3 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                        <p className="whitespace-pre-wrap">{val}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
