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
import { DoorOpen, Plus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const DISCHARGE_TYPES = ["REGULAR","AMA","TRANSFER","DEATH","ABSCONDED"];
const today = format(new Date(), "yyyy-MM-dd");

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-800",
};

const typeColors: Record<string, string> = {
  AMA: "text-orange-600",
  DEATH: "text-gray-500",
  ABSCONDED: "text-red-600",
};

export function DischargePage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({ dischargeNotes: "", followUpDate: "", followUpInstructions: "", medicationsOnDischarge: "" });
  const [completeOpen, setCompleteOpen] = useState(false);

  const [form, setForm] = useState({
    patientId: "", bedId: "", admittedAt: "", dischargeType: "REGULAR",
    dischargeNotes: "", followUpDate: "", followUpInstructions: "", medicationsOnDischarge: "",
  });

  const params = new URLSearchParams({ date });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (typeFilter !== "all") params.set("dischargeType", typeFilter);

  const { data: discharges = [] } = useQuery({
    queryKey: ["discharge", date, statusFilter, typeFilter],
    queryFn: () => api.get(`/discharge?${params}`).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["discharge-summary"],
    queryFn: () => api.get("/discharge/summary").then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["discharge"] });
    qc.invalidateQueries({ queryKey: ["discharge-summary"] });
  };

  const create = useMutation({
    mutationFn: (data: any) => api.post("/discharge", data).then((r) => r.data),
    onSuccess: () => { invalidate(); setAddOpen(false); setForm({ patientId: "", bedId: "", admittedAt: "", dischargeType: "REGULAR", dischargeNotes: "", followUpDate: "", followUpInstructions: "", medicationsOnDischarge: "" }); },
  });

  const complete = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/discharge/${id}/complete`, data).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); setCompleteOpen(false); setCompleteForm({ dischargeNotes: "", followUpDate: "", followUpInstructions: "", medicationsOnDischarge: "" }); },
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.patch(`/discharge/${id}/cancel`, {}).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); },
  });

  const openSheet = (d: any) => {
    setSelected(d);
    setSheetOpen(true);
    setCompleteForm({ dischargeNotes: d.dischargeNotes ?? "", followUpDate: "", followUpInstructions: d.followUpInstructions ?? "", medicationsOnDischarge: d.medicationsOnDischarge ?? "" });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DoorOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Discharge Management</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Initiate Discharge</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Initiate Patient Discharge</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Patient ID</Label>
                  <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Patient ID" />
                </div>
                <div className="space-y-1">
                  <Label>Bed ID (optional)</Label>
                  <Input value={form.bedId} onChange={(e) => setForm({ ...form, bedId: e.target.value })} placeholder="Bed ID" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Discharge Type</Label>
                  <Select value={form.dischargeType} onValueChange={(v) => setForm({ ...form, dischargeType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DISCHARGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Admission Date</Label>
                  <Input type="date" value={form.admittedAt} onChange={(e) => setForm({ ...form, admittedAt: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Discharge Notes</Label>
                <Textarea rows={3} value={form.dischargeNotes} onChange={(e) => setForm({ ...form, dischargeNotes: e.target.value })} placeholder="Summary of treatment, discharge reason…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Follow-up Date</Label>
                  <Input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Medications on Discharge</Label>
                  <Input value={form.medicationsOnDischarge} onChange={(e) => setForm({ ...form, medicationsOnDischarge: e.target.value })} placeholder="e.g. Amoxicillin 500mg TDS" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Follow-up Instructions</Label>
                <Textarea rows={2} value={form.followUpInstructions} onChange={(e) => setForm({ ...form, followUpInstructions: e.target.value })} placeholder="Return if fever >38°C, wound changes…" />
              </div>
              <Button className="w-full" onClick={() => create.mutate(form)} disabled={create.isPending || !form.patientId}>
                Initiate Discharge
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
            { label: "Discharged Today", value: summary.completedToday, color: "text-green-600" },
            { label: "AMA Discharges", value: summary.ama, color: "text-orange-600" },
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DISCHARGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Discharge #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Initiated</TableHead>
              <TableHead>Discharged At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discharges.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No discharge records found</TableCell></TableRow>
            ) : discharges.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.dischargeNumber}</TableCell>
                <TableCell className="text-sm">{d.patient ? `${d.patient.firstName} ${d.patient.lastName}` : "—"}</TableCell>
                <TableCell className="text-sm">{d.dischargingDoctor ? `${d.dischargingDoctor.firstName} ${d.dischargingDoctor.lastName}` : "—"}</TableCell>
                <TableCell><Badge variant="outline" className={`text-xs ${typeColors[d.dischargeType] ?? ""}`}>{d.dischargeType.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-sm">{format(new Date(d.createdAt), "dd MMM HH:mm")}</TableCell>
                <TableCell className="text-sm">{d.dischargedAt ? format(new Date(d.dischargedAt), "dd MMM HH:mm") : "—"}</TableCell>
                <TableCell><Badge className={statusColors[d.status] ?? ""}>{d.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => openSheet(d)}>View</Button></TableCell>
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
                  <DoorOpen className="h-5 w-5" />{selected.dischargeNumber}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{selected.patient?.firstName} {selected.patient?.lastName}</span></div>
                  {selected.patient?.mrn && <div className="flex justify-between"><span className="text-muted-foreground">MRN</span><span className="font-mono">{selected.patient.mrn}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span>{selected.dischargingDoctor?.firstName} {selected.dischargingDoctor?.lastName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="outline" className={typeColors[selected.dischargeType] ?? ""}>{selected.dischargeType.replace("_", " ")}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[selected.status] ?? ""}>{selected.status}</Badge></div>
                  {selected.admittedAt && <div className="flex justify-between"><span className="text-muted-foreground">Admitted</span><span>{format(new Date(selected.admittedAt), "dd MMM yyyy")}</span></div>}
                  {selected.dischargedAt && <div className="flex justify-between"><span className="text-muted-foreground">Discharged</span><span>{format(new Date(selected.dischargedAt), "dd MMM yyyy HH:mm")}</span></div>}
                  {selected.followUpDate && <div className="flex justify-between"><span className="text-muted-foreground">Follow-up</span><span>{format(new Date(selected.followUpDate), "dd MMM yyyy")}</span></div>}
                </div>

                {selected.dischargeNotes && <div className="rounded-lg border p-3 space-y-1"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Discharge Notes</p><p className="text-sm whitespace-pre-wrap">{selected.dischargeNotes}</p></div>}
                {selected.medicationsOnDischarge && <div className="rounded-lg border p-3 space-y-1"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Medications</p><p className="text-sm">{selected.medicationsOnDischarge}</p></div>}
                {selected.followUpInstructions && <div className="rounded-lg border p-3 space-y-1"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Follow-up Instructions</p><p className="text-sm whitespace-pre-wrap">{selected.followUpInstructions}</p></div>}

                {selected.status === "PENDING" && (
                  <>
                    <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="sm"><CheckCircle2 className="mr-2 h-4 w-4" />Complete Discharge</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Complete Discharge</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-1"><Label>Discharge Notes</Label><Textarea rows={3} value={completeForm.dischargeNotes} onChange={(e) => setCompleteForm({ ...completeForm, dischargeNotes: e.target.value })} placeholder="Final summary…" /></div>
                          <div className="space-y-1"><Label>Follow-up Date</Label><Input type="date" value={completeForm.followUpDate} onChange={(e) => setCompleteForm({ ...completeForm, followUpDate: e.target.value })} /></div>
                          <div className="space-y-1"><Label>Medications on Discharge</Label><Input value={completeForm.medicationsOnDischarge} onChange={(e) => setCompleteForm({ ...completeForm, medicationsOnDischarge: e.target.value })} placeholder="Medications…" /></div>
                          <div className="space-y-1"><Label>Follow-up Instructions</Label><Textarea rows={2} value={completeForm.followUpInstructions} onChange={(e) => setCompleteForm({ ...completeForm, followUpInstructions: e.target.value })} placeholder="Patient instructions…" /></div>
                          <Button className="w-full" onClick={() => complete.mutate({ id: selected.id, data: completeForm })} disabled={complete.isPending}>Confirm Discharge</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" className="w-full text-destructive" onClick={() => cancel.mutate(selected.id)} disabled={cancel.isPending}>Cancel</Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
