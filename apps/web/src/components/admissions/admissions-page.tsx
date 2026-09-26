"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Loader2, Plus, ArrowRightLeft, LogOut, Clock } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const naira = (v: string | number) =>
  `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CensusPatient {
  admissionId: string;
  admissionNumber: string;
  patient: { id: string; mrn: string; firstName: string; lastName: string };
  attendingDoctor: { firstName: string; lastName: string } | null;
  bed: { bedNumber: string; ward: string; wardClass: string | null } | null;
  admittedAt: string;
  daysAdmitted: number;
  expectedDischargeAt: string | null;
}

function useFreeBeds() {
  return useQuery({
    queryKey: ["beds"],
    queryFn: async () => (await api.get("/beds")).data,
  });
}

function AdmitDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    patientId: "",
    bedId: "",
    admittingDoctorId: "",
    admissionType: "EMERGENCY",
    reason: "",
    provisionalDiagnosis: "",
  });

  const { data: patients } = useQuery({
    queryKey: ["patients-lookup", search],
    queryFn: async () => (await api.get("/patients", { params: { search, limit: 10 } })).data,
    enabled: search.length > 1,
  });
  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => (await api.get("/staff/doctors")).data,
  });
  const { data: beds } = useFreeBeds();

  const admit = useMutation({
    mutationFn: () => api.post("/admissions", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["census"] });
      qc.invalidateQueries({ queryKey: ["beds"] });
      toast({ title: "Patient admitted", description: "Bed assigned and nightly charges started." });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const patientList = patients?.data ?? [];
  const doctorList = doctors?.data ?? doctors ?? [];
  const freeBeds = (beds ?? []).filter((b: any) => !b.isOccupied);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Admit Patient</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Find patient *</Label>
            <Input
              placeholder="Search by name, MRN or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {patientList.length > 0 && (
              <div className="mt-1 max-h-36 overflow-y-auto rounded border">
                {patientList.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, patientId: p.id });
                      setSearch(`${p.firstName} ${p.lastName} — ${p.mrn}`);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                      form.patientId === p.id ? "bg-muted font-medium" : ""
                    }`}
                  >
                    {p.firstName} {p.lastName} · {p.mrn}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Bed *</Label>
              <Select value={form.bedId} onValueChange={(v) => setForm({ ...form, bedId: v })}>
                <SelectTrigger><SelectValue placeholder="Free beds…" /></SelectTrigger>
                <SelectContent>
                  {freeBeds.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.ward} · {b.bedNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Admitting doctor *</Label>
              <Select
                value={form.admittingDoctorId}
                onValueChange={(v) => setForm({ ...form, admittingDoctorId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {doctorList.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      Dr {d.firstName} {d.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Admission type</Label>
            <Select
              value={form.admissionType}
              onValueChange={(v) => setForm({ ...form, admissionType: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["EMERGENCY", "ELECTIVE", "MATERNITY", "TRANSFER_IN", "DAY_CASE"].map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Reason for admission *</Label>
            <Input
              placeholder="e.g. Severe malaria with dehydration"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Provisional diagnosis</Label>
            <Input
              value={form.provisionalDiagnosis}
              onChange={(e) => setForm({ ...form, provisionalDiagnosis: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.patientId || !form.bedId || !form.admittingDoctorId || !form.reason || admit.isPending}
            onClick={() => admit.mutate()}
          >
            {admit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Admit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ row, onClose }: { row: CensusPatient; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [targetBedId, setTargetBedId] = useState("");
  const [reason, setReason] = useState("");
  const { data: beds } = useFreeBeds();

  const transfer = useMutation({
    mutationFn: () => api.patch(`/admissions/${row.admissionId}/transfer`, { targetBedId, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["census"] });
      qc.invalidateQueries({ queryKey: ["beds"] });
      toast({ title: "Patient transferred" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const freeBeds = (beds ?? []).filter((b: any) => !b.isOccupied);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Transfer {row.patient.firstName} {row.patient.lastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Currently in {row.bed ? `${row.bed.ward} · ${row.bed.bedNumber}` : "no bed"}
          </p>
          <div className="space-y-1">
            <Label className="text-xs">Move to *</Label>
            <Select value={targetBedId} onValueChange={setTargetBedId}>
              <SelectTrigger><SelectValue placeholder="Free beds…" /></SelectTrigger>
              <SelectContent>
                {freeBeds.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.ward} · {b.bedNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!targetBedId || transfer.isPending} onClick={() => transfer.mutate()}>
            {transfer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DischargeDialog({ row, onClose }: { row: CensusPatient; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    dischargeType: "REGULAR",
    dischargeNotes: "",
    followUpInstructions: "",
  });

  const { data: statement } = useQuery({
    queryKey: ["admission-detail", row.admissionId],
    queryFn: async () => (await api.get(`/admissions/${row.admissionId}`)).data,
  });

  const discharge = useMutation({
    mutationFn: () => api.post(`/admissions/${row.admissionId}/discharge`, form),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["census"] });
      qc.invalidateQueries({ queryKey: ["beds"] });
      const inv = res.data?.invoice;
      toast({
        title: "Patient discharged",
        description: inv
          ? `Final invoice ${inv.invoiceNumber} — ${naira(inv.total)}`
          : "Bed released; no outstanding charges",
      });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Discharge {row.patient.firstName} {row.patient.lastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {row.admissionNumber} · {row.daysAdmitted} day{row.daysAdmitted === 1 ? "" : "s"} admitted
          </p>
          <div className="space-y-1">
            <Label className="text-xs">Discharge type</Label>
            <Select
              value={form.dischargeType}
              onValueChange={(v) => setForm({ ...form, dischargeType: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["REGULAR", "AGAINST_MEDICAL_ADVICE", "TRANSFERRED", "ABSCONDED", "DECEASED"].map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Discharge notes</Label>
            <Input
              value={form.dischargeNotes}
              onChange={(e) => setForm({ ...form, dischargeNotes: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Follow-up instructions</Label>
            <Input
              value={form.followUpInstructions}
              onChange={(e) => setForm({ ...form, followUpInstructions: e.target.value })}
            />
          </div>
          <p className="rounded bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Discharging frees the bed, closes the episode and raises a final invoice for
            everything still unbilled.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={discharge.isPending} onClick={() => discharge.mutate()}>
            {discharge.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Discharge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdmissionsPage() {
  const [showAdmit, setShowAdmit] = useState(false);
  const [transferRow, setTransferRow] = useState<CensusPatient | null>(null);
  const [dischargeRow, setDischargeRow] = useState<CensusPatient | null>(null);

  const { data: census, isLoading } = useQuery({
    queryKey: ["census"],
    queryFn: async () => (await api.get("/admissions/census")).data,
  });

  const patients: CensusPatient[] = census?.patients ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BedDouble className="h-6 w-6" /> Admissions
          </h1>
          <p className="text-sm text-muted-foreground">
            Live inpatient census. Bed charges post automatically every night.
          </p>
        </div>
        <Button onClick={() => setShowAdmit(true)}>
          <Plus className="mr-2 h-4 w-4" /> Admit Patient
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="px-4 pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Currently Admitted</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{census?.totalAdmitted ?? 0}</p>
          </CardContent>
        </Card>
        {(census?.byWard ?? []).slice(0, 3).map((w: any) => (
          <Card key={w.ward}>
            <CardHeader className="px-4 pb-1 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{w.ward}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{w.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Ward Board</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Consultant</TableHead>
                  <TableHead>LOS</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No patients currently admitted.
                    </TableCell>
                  </TableRow>
                )}
                {patients.map((p) => (
                  <TableRow key={p.admissionId}>
                    <TableCell className="font-mono text-xs">{p.admissionNumber}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {p.patient.firstName} {p.patient.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.patient.mrn}</div>
                    </TableCell>
                    <TableCell>
                      {p.bed ? (
                        <div>
                          <div className="text-sm">{p.bed.bedNumber}</div>
                          <div className="text-xs text-muted-foreground">{p.bed.ward}</div>
                        </div>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.attendingDoctor ? `Dr ${p.attendingDoctor.firstName} ${p.attendingDoctor.lastName}` : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {p.daysAdmitted}d
                      </span>
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setTransferRow(p)}>
                        <ArrowRightLeft className="mr-1 h-3.5 w-3.5" /> Transfer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDischargeRow(p)}>
                        <LogOut className="mr-1 h-3.5 w-3.5" /> Discharge
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showAdmit && <AdmitDialog onClose={() => setShowAdmit(false)} />}
      {transferRow && <TransferDialog row={transferRow} onClose={() => setTransferRow(null)} />}
      {dischargeRow && <DischargeDialog row={dischargeRow} onClose={() => setDischargeRow(null)} />}
    </div>
  );
}
