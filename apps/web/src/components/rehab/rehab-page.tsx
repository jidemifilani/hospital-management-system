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
import { Dumbbell, Plus, PlayCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const THERAPY_TYPES = ["PHYSIOTHERAPY","OCCUPATIONAL","SPEECH","RESPIRATORY","CARDIAC","OTHER"];
const STATUSES = ["SCHEDULED","IN_PROGRESS","COMPLETED","CANCELLED","NO_SHOW"];

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-800",
  NO_SHOW: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export function RehabPage() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({ sessionNotes: "", progressNotes: "", functionalScore: "" });

  const [form, setForm] = useState({ patientId: "", therapistId: "", type: "PHYSIOTHERAPY", scheduledAt: `${today}T09:00`, goals: "" });

  const params = new URLSearchParams({ date });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (typeFilter !== "all") params.set("type", typeFilter);

  const { data: sessions = [] } = useQuery({
    queryKey: ["rehab", date, statusFilter, typeFilter],
    queryFn: () => api.get(`/rehab?${params}`).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["rehab-summary"],
    queryFn: () => api.get("/rehab/summary").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["rehab"] });
    qc.invalidateQueries({ queryKey: ["rehab-summary"] });
  };

  const create = useMutation({
    mutationFn: (data: any) => api.post("/rehab", data).then((r) => r.data),
    onSuccess: () => { invalidate(); setAddOpen(false); setForm({ patientId: "", therapistId: "", type: "PHYSIOTHERAPY", scheduledAt: `${today}T09:00`, goals: "" }); },
  });

  const start = useMutation({
    mutationFn: (id: string) => api.patch(`/rehab/${id}/start`, {}).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); },
  });

  const complete = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/rehab/${id}/complete`, data).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); setCompleteOpen(false); setCompleteForm({ sessionNotes: "", progressNotes: "", functionalScore: "" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/rehab/${id}/status`, { status }).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); },
  });

  const openSheet = (s: any) => { setSelected(s); setSheetOpen(true); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Physiotherapy & Rehab</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Schedule Session</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Therapy Session</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Patient ID</Label>
                  <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Patient ID" />
                </div>
                <div className="space-y-1">
                  <Label>Therapist ID</Label>
                  <Input value={form.therapistId} onChange={(e) => setForm({ ...form, therapistId: e.target.value })} placeholder="Staff ID" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Therapy Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{THERAPY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Scheduled At</Label>
                  <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Goals</Label>
                <Textarea rows={2} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="Session objectives…" />
              </div>
              <Button className="w-full" onClick={() => create.mutate(form)} disabled={create.isPending || !form.patientId || !form.therapistId}>
                Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Scheduled Today", value: summary.total, color: "text-primary" },
            { label: "In Progress", value: summary.inProgress, color: "text-purple-600" },
            { label: "Completed Today", value: summary.completedToday, color: "text-green-600" },
            { label: "No-Show", value: summary.noShow, color: "text-orange-600" },
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Therapy Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {THERAPY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Therapist</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No sessions found</TableCell></TableRow>
            ) : sessions.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.sessionNumber}</TableCell>
                <TableCell className="text-sm">{s.patient ? `${s.patient.firstName} ${s.patient.lastName}` : "—"}</TableCell>
                <TableCell className="text-sm">{s.therapist ? `${s.therapist.firstName} ${s.therapist.lastName}` : "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{s.type.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-sm">{format(new Date(s.scheduledAt), "HH:mm")}</TableCell>
                <TableCell><Badge className={statusColors[s.status] ?? ""}>{s.status.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-sm">{s.functionalScore != null ? `${s.functionalScore}/10` : "—"}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => openSheet(s)}>View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[440px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  {selected.sessionNumber}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{selected.patient ? `${selected.patient.firstName} ${selected.patient.lastName}` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Therapist</span><span>{selected.therapist ? `${selected.therapist.firstName} ${selected.therapist.lastName}` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="outline">{selected.type.replace("_", " ")}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[selected.status] ?? ""}>{selected.status}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Scheduled</span><span>{format(new Date(selected.scheduledAt), "dd MMM yyyy HH:mm")}</span></div>
                  {selected.startedAt && <div className="flex justify-between"><span className="text-muted-foreground">Started</span><span>{format(new Date(selected.startedAt), "HH:mm")}</span></div>}
                  {selected.endedAt && <div className="flex justify-between"><span className="text-muted-foreground">Ended</span><span>{format(new Date(selected.endedAt), "HH:mm")}</span></div>}
                  {selected.functionalScore != null && <div className="flex justify-between"><span className="text-muted-foreground">Functional Score</span><span className="font-bold">{selected.functionalScore}/10</span></div>}
                  {selected.goals && <div className="pt-1 border-t"><p className="text-muted-foreground text-xs">Goals</p><p className="mt-1">{selected.goals}</p></div>}
                  {selected.sessionNotes && <div className="pt-1 border-t"><p className="text-muted-foreground text-xs">Session Notes</p><p className="mt-1">{selected.sessionNotes}</p></div>}
                  {selected.progressNotes && <div className="pt-1 border-t"><p className="text-muted-foreground text-xs">Progress Notes</p><p className="mt-1">{selected.progressNotes}</p></div>}
                </div>

                {selected.status === "SCHEDULED" && (
                  <Button className="w-full" size="sm" onClick={() => start.mutate(selected.id)} disabled={start.isPending}>
                    <PlayCircle className="mr-2 h-4 w-4" />Start Session
                  </Button>
                )}

                {selected.status === "IN_PROGRESS" && (
                  <>
                    <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="sm"><CheckCircle2 className="mr-2 h-4 w-4" />Complete Session</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Complete Session</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-1">
                            <Label>Functional Score (0–10)</Label>
                            <Input type="number" min="0" max="10" step="0.5" value={completeForm.functionalScore} onChange={(e) => setCompleteForm({ ...completeForm, functionalScore: e.target.value })} placeholder="Optional" />
                          </div>
                          <div className="space-y-1">
                            <Label>Session Notes</Label>
                            <Textarea rows={3} value={completeForm.sessionNotes} onChange={(e) => setCompleteForm({ ...completeForm, sessionNotes: e.target.value })} placeholder="What was done…" />
                          </div>
                          <div className="space-y-1">
                            <Label>Progress Notes</Label>
                            <Textarea rows={2} value={completeForm.progressNotes} onChange={(e) => setCompleteForm({ ...completeForm, progressNotes: e.target.value })} placeholder="Patient progress…" />
                          </div>
                          <Button className="w-full" onClick={() => complete.mutate({ id: selected.id, data: completeForm })} disabled={complete.isPending}>
                            Confirm
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => updateStatus.mutate({ id: selected.id, status: "NO_SHOW" })} disabled={updateStatus.isPending}>
                      Mark No-Show
                    </Button>
                  </>
                )}

                {["SCHEDULED", "IN_PROGRESS"].includes(selected.status) && (
                  <Button variant="outline" size="sm" className="w-full text-destructive" onClick={() => updateStatus.mutate({ id: selected.id, status: "CANCELLED" })} disabled={updateStatus.isPending}>
                    Cancel Session
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
