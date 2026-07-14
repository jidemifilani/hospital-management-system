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
import { NotepadText, Plus, CheckCircle2, SkipForward, Clock, User } from "lucide-react";
import { format } from "date-fns";

const ROUTES = ["ORAL","IV","IM","SC","TOPICAL","INHALATION","SUBLINGUAL","RECTAL","NASOGASTRIC"];
const STATUSES = ["SCHEDULED","ADMINISTERED","SKIPPED","REFUSED","HELD"];

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  ADMINISTERED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  SKIPPED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  REFUSED: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  HELD: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

export function MarPage() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");
  const [patientId, setPatientId] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [skipStatus, setSkipStatus] = useState("SKIPPED");
  const [adminNotes, setAdminNotes] = useState("");

  const [form, setForm] = useState({
    patientId: "", medicationName: "", dose: "", route: "ORAL",
    scheduledTime: `${today}T08:00`, notes: "",
  });

  const params = new URLSearchParams({ date });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (patientId) params.set("patientId", patientId);

  const { data: records = [] } = useQuery({
    queryKey: ["mar", date, statusFilter, patientId],
    queryFn: () => api.get(`/mar?${params}`).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["mar-summary"],
    queryFn: () => api.get("/mar/summary").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["mar"] });
    qc.invalidateQueries({ queryKey: ["mar-summary"] });
  };

  const create = useMutation({
    mutationFn: (data: any) => api.post("/mar", data).then((r) => r.data),
    onSuccess: () => { invalidate(); setAddOpen(false); setForm({ patientId: "", medicationName: "", dose: "", route: "ORAL", scheduledTime: `${today}T08:00`, notes: "" }); },
  });

  const administer = useMutation({
    mutationFn: ({ id, notes }: any) => api.patch(`/mar/${id}/administer`, { notes }).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); setAdminNotes(""); },
  });

  const skip = useMutation({
    mutationFn: ({ id, reason, status }: any) => api.patch(`/mar/${id}/skip`, { reason, status }).then((r) => r.data),
    onSuccess: () => { invalidate(); setSelected(null); setSheetOpen(false); setSkipReason(""); },
  });

  const openSheet = (rec: any) => { setSelected(rec); setSheetOpen(true); setAdminNotes(""); setSkipReason(""); setSkipStatus("SKIPPED"); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NotepadText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Medication Administration Record</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Schedule Medication</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Medication</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Patient ID</Label>
                <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Patient ID" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Medication</Label>
                  <Input value={form.medicationName} onChange={(e) => setForm({ ...form, medicationName: e.target.value })} placeholder="Drug name" />
                </div>
                <div className="space-y-1">
                  <Label>Dose</Label>
                  <Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="e.g. 500mg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Route</Label>
                  <Select value={form.route} onValueChange={(v) => setForm({ ...form, route: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROUTES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Scheduled Time</Label>
                  <Input type="datetime-local" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button className="w-full" onClick={() => create.mutate(form)} disabled={create.isPending || !form.patientId || !form.medicationName || !form.dose}>
                Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Scheduled", value: summary.scheduled, color: "text-blue-600" },
            { label: "Administered", value: summary.administered, color: "text-green-600" },
            { label: "Skipped", value: summary.skipped, color: "text-gray-500" },
            { label: "Refused", value: summary.refused, color: "text-orange-600" },
            { label: "Held", value: summary.held, color: "text-yellow-600" },
            { label: "Total Today", value: summary.total, color: "text-primary" },
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
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Filter by patient ID…" value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-52" />
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>MAR #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Medication</TableHead>
              <TableHead>Dose / Route</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Administered By</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>
            ) : records.map((rec: any) => (
              <TableRow key={rec.id} className={rec.status === "SCHEDULED" ? "bg-blue-50/40 dark:bg-blue-950/10" : ""}>
                <TableCell className="font-mono text-xs">{rec.marNumber}</TableCell>
                <TableCell>{rec.patient ? `${rec.patient.firstName} ${rec.patient.lastName}` : "—"}</TableCell>
                <TableCell className="font-medium">{rec.medicationName}</TableCell>
                <TableCell className="text-sm">{rec.dose} · {rec.route}</TableCell>
                <TableCell className="text-sm">{format(new Date(rec.scheduledTime), "HH:mm")}</TableCell>
                <TableCell><Badge className={statusColors[rec.status] ?? ""}>{rec.status}</Badge></TableCell>
                <TableCell className="text-sm">{rec.administeredBy ? `${rec.administeredBy.firstName} ${rec.administeredBy.lastName}` : "—"}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => openSheet(rec)}>Details</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[420px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <NotepadText className="h-5 w-5" />
                  {selected.marNumber}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{selected.patient ? `${selected.patient.firstName} ${selected.patient.lastName}` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Medication</span><span className="font-medium">{selected.medicationName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Dose</span><span>{selected.dose}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Route</span><span>{selected.route}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Scheduled</span><span>{format(new Date(selected.scheduledTime), "dd MMM yyyy HH:mm")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[selected.status] ?? ""}>{selected.status}</Badge></div>
                  {selected.administeredAt && <div className="flex justify-between"><span className="text-muted-foreground">Given at</span><span>{format(new Date(selected.administeredAt), "HH:mm")}</span></div>}
                  {selected.administeredBy && <div className="flex justify-between"><span className="text-muted-foreground">Given by</span><span>{selected.administeredBy.firstName} {selected.administeredBy.lastName}</span></div>}
                  {selected.notes && <div className="pt-1 border-t"><p className="text-muted-foreground text-xs">Notes</p><p className="mt-1">{selected.notes}</p></div>}
                  {selected.reasonSkipped && <div className="pt-1 border-t"><p className="text-muted-foreground text-xs">Skip reason</p><p className="mt-1">{selected.reasonSkipped}</p></div>}
                </div>

                {selected.status === "SCHEDULED" && (
                  <div className="space-y-3 border rounded-lg p-4">
                    <p className="text-sm font-medium">Mark as Administered</p>
                    <Textarea rows={2} placeholder="Notes (optional)" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
                    <Button className="w-full" size="sm" onClick={() => administer.mutate({ id: selected.id, notes: adminNotes })} disabled={administer.isPending}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />Mark Administered
                    </Button>
                  </div>
                )}

                {["SCHEDULED", "HELD"].includes(selected.status) && (
                  <div className="space-y-3 border rounded-lg p-4">
                    <p className="text-sm font-medium">Skip / Hold</p>
                    <Select value={skipStatus} onValueChange={setSkipStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SKIPPED">Skipped</SelectItem>
                        <SelectItem value="REFUSED">Refused</SelectItem>
                        <SelectItem value="HELD">Held</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Reason" value={skipReason} onChange={(e) => setSkipReason(e.target.value)} />
                    <Button variant="outline" className="w-full" size="sm" onClick={() => skip.mutate({ id: selected.id, reason: skipReason, status: skipStatus })} disabled={skip.isPending}>
                      <SkipForward className="mr-2 h-4 w-4" />{skipStatus.charAt(0) + skipStatus.slice(1).toLowerCase()}
                    </Button>
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
