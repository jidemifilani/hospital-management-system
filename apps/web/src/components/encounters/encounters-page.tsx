"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stethoscope, Loader2, Receipt, X, Plus } from "lucide-react";
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

const STATUS_STYLES: Record<string, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  ARRIVED: "bg-blue-100 text-blue-700",
  TRIAGED: "bg-amber-100 text-amber-700",
  IN_CONSULTATION: "bg-indigo-100 text-indigo-700",
  OBSERVATION: "bg-purple-100 text-purple-700",
  ADMITTED: "bg-emerald-100 text-emerald-700",
  DISCHARGED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
};

const OPEN_STATUSES = ["PLANNED", "ARRIVED", "TRIAGED", "IN_CONSULTATION", "OBSERVATION", "ADMITTED"];
const ALL_STATUSES = [...OPEN_STATUSES, "DISCHARGED", "CANCELLED"];
const TYPES = ["OUTPATIENT", "INPATIENT", "EMERGENCY", "DAY_CASE", "TELEMEDICINE"];

interface Encounter {
  id: string;
  encounterNumber: string;
  type: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  chiefComplaint: string | null;
  patient: { id: string; mrn: string; firstName: string; lastName: string; phone: string };
  department: { id: string; name: string };
  attendingDoctor: { firstName: string; lastName: string } | null;
  admission: { id: string; admissionNumber: string; status: string } | null;
}

function NewEncounterDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    patientId: "",
    departmentId: "",
    type: "OUTPATIENT",
    chiefComplaint: "",
  });

  const { data: patients } = useQuery({
    queryKey: ["patients-lookup", search],
    queryFn: async () => (await api.get("/patients", { params: { search, limit: 10 } })).data,
    enabled: search.length > 1,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await api.get("/departments")).data,
  });

  const create = useMutation({
    mutationFn: () => api.post("/encounters", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encounters"] });
      toast({ title: "Encounter opened", description: "Consultation fee charged automatically." });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deptList = departments?.data ?? departments ?? [];
  const patientList = patients?.items ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Open Encounter</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="enc-patient" className="text-xs">Find patient *</Label>
            <Input
              id="enc-patient"
              placeholder="Search by name, MRN or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {patientList.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded border">
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
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Department *</Label>
              <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {deptList.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="enc-complaint" className="text-xs">Chief complaint</Label>
            <Input
              id="enc-complaint"
              placeholder="e.g. Fever and headache for 3 days"
              value={form.chiefComplaint}
              onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.patientId || !form.departmentId || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Open Encounter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatementDialog({ encounter, onClose }: { encounter: Encounter; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: statement, isLoading } = useQuery({
    queryKey: ["charges-statement", encounter.id],
    queryFn: async () => (await api.get(`/charges/encounter/${encounter.id}/statement`)).data,
  });

  const close = useMutation({
    mutationFn: () => api.post(`/encounters/${encounter.id}/close`, {}),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["encounters"] });
      const inv = res.data?.invoice;
      toast({
        title: "Encounter closed",
        description: inv ? `Invoice ${inv.invoiceNumber} raised for ${naira(inv.total)}` : "No outstanding charges",
      });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const live = (statement?.charges ?? []).filter((c: any) => !c.isVoided);
  const isOpen = OPEN_STATUSES.includes(encounter.status);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {encounter.encounterNumber} · {encounter.patient.firstName} {encounter.patient.lastName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-80 overflow-y-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {live.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                        No charges yet
                      </TableCell>
                    </TableRow>
                  )}
                  {live.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {c.source.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.description}</TableCell>
                      <TableCell className="text-right text-sm">{c.quantity}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{naira(c.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-6 rounded border bg-muted/40 px-4 py-3 text-sm">
              <div>
                <span className="text-muted-foreground">Billed </span>
                <span className="font-medium">{naira(statement?.totals?.billed ?? 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Unbilled </span>
                <span className="font-medium text-amber-600">{naira(statement?.totals?.unbilled ?? 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total </span>
                <span className="text-base font-bold">{naira(statement?.totals?.gross ?? 0)}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {isOpen && !encounter.admission && (
            <Button onClick={() => close.mutate()} disabled={close.isPending}>
              {close.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Receipt className="mr-2 h-4 w-4" />
              Close &amp; Invoice
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EncountersPage() {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Encounter | null>(null);
  const [status, setStatus] = useState<string>("open");
  const [type, setType] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["encounters", status, type],
    queryFn: async () =>
      (
        await api.get("/encounters", {
          params: {
            ...(status === "open" ? { openOnly: true } : status !== "all" ? { status } : {}),
            ...(type !== "all" ? { type } : {}),
            limit: 50,
          },
        })
      ).data,
  });

  const encounters: Encounter[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Stethoscope className="h-6 w-6" /> Encounters
          </h1>
          <p className="text-sm text-muted-foreground">
            Every episode of care. Orders and charges attach here automatically.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> Open Encounter
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open only</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {encounters.length} encounter{encounters.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Encounter</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Bill</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encounters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No encounters match these filters.
                    </TableCell>
                  </TableRow>
                )}
                {encounters.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.encounterNumber}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {e.patient.firstName} {e.patient.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{e.patient.mrn}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{e.type.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[e.status] ?? ""}`}>
                        {e.status.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{e.department.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(e.startedAt).toLocaleString("en-NG", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(e)}>
                        <Receipt className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showNew && <NewEncounterDialog onClose={() => setShowNew(false)} />}
      {selected && <StatementDialog encounter={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
