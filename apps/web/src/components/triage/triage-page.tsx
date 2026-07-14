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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Plus, AlertCircle, Clock, Activity } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const TRIAGE_LEVELS = ["IMMEDIATE", "EMERGENT", "URGENT", "SEMI_URGENT", "NON_URGENT"];
const TRIAGE_LEVEL_COLORS: Record<string, string> = {
  IMMEDIATE: "bg-red-600 text-white",
  EMERGENT: "bg-orange-500 text-white",
  URGENT: "bg-yellow-500 text-white",
  SEMI_URGENT: "bg-green-500 text-white",
  NON_URGENT: "bg-blue-400 text-white",
};
const TRIAGE_LEVEL_LABELS: Record<string, string> = {
  IMMEDIATE: "Level 1 — Immediate",
  EMERGENT: "Level 2 — Emergent",
  URGENT: "Level 3 — Urgent",
  SEMI_URGENT: "Level 4 — Semi-Urgent",
  NON_URGENT: "Level 5 — Non-Urgent",
};

function triageBadge(level: string) {
  return (
    <Badge className={TRIAGE_LEVEL_COLORS[level] ?? "bg-gray-100 text-gray-800"}>
      {level.replace(/_/g, " ")}
    </Badge>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    WAITING: "bg-yellow-100 text-yellow-800",
    IN_ASSESSMENT: "bg-blue-100 text-blue-800",
    ASSESSED: "bg-green-100 text-green-800",
    ADMITTED: "bg-purple-100 text-purple-800",
    DISCHARGED: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status.replace(/_/g, " ")}</Badge>;
}

function TriageFormDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: "", walkinName: "", walkinPhone: "",
    chiefComplaint: "", triageLevel: "URGENT",
    systolicBP: "", diastolicBP: "", heartRate: "",
    temperature: "", oxygenSaturation: "", respiratoryRate: "",
    painScore: "", glasgowComaScale: "", notes: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/triage", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  const n = (v: string) => v ? Number(v) : undefined;
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Triage</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Triage Assessment</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Patient ID (registered)</Label>
              <Input value={form.patientId} onChange={f("patientId")} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label>Walk-in Name</Label>
              <Input value={form.walkinName} onChange={f("walkinName")} placeholder="If not registered" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Chief Complaint</Label>
            <Input value={form.chiefComplaint} onChange={f("chiefComplaint")} placeholder="e.g. Chest pain, difficulty breathing" />
          </div>
          <div className="space-y-1">
            <Label>Triage Level</Label>
            <div className="grid grid-cols-1 gap-1">
              {TRIAGE_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setForm({ ...form, triageLevel: lvl })}
                  className={`rounded-md px-3 py-2 text-left text-sm font-medium transition-all ${
                    form.triageLevel === lvl ? TRIAGE_LEVEL_COLORS[lvl] : "border hover:bg-muted"
                  }`}
                >
                  {TRIAGE_LEVEL_LABELS[lvl]}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-2">Vital Signs</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Systolic BP</Label>
                <Input value={form.systolicBP} onChange={f("systolicBP")} type="number" placeholder="mmHg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Diastolic BP</Label>
                <Input value={form.diastolicBP} onChange={f("diastolicBP")} type="number" placeholder="mmHg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Heart Rate</Label>
                <Input value={form.heartRate} onChange={f("heartRate")} type="number" placeholder="bpm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Temperature</Label>
                <Input value={form.temperature} onChange={f("temperature")} type="number" step="0.1" placeholder="°C" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">SpO₂ %</Label>
                <Input value={form.oxygenSaturation} onChange={f("oxygenSaturation")} type="number" placeholder="%" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Resp. Rate</Label>
                <Input value={form.respiratoryRate} onChange={f("respiratoryRate")} type="number" placeholder="/min" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pain Score (0–10)</Label>
                <Input value={form.painScore} onChange={f("painScore")} type="number" min="0" max="10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">GCS (3–15)</Label>
                <Input value={form.glasgowComaScale} onChange={f("glasgowComaScale")} type="number" min="3" max="15" />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={f("notes")} rows={2} />
          </div>
          <Button
            className="w-full"
            disabled={!form.chiefComplaint || (!form.patientId && !form.walkinName) || mutation.isPending}
            onClick={() => mutation.mutate({
              ...form,
              patientId: form.patientId || undefined,
              systolicBP: n(form.systolicBP), diastolicBP: n(form.diastolicBP),
              heartRate: n(form.heartRate), temperature: n(form.temperature),
              oxygenSaturation: n(form.oxygenSaturation), respiratoryRate: n(form.respiratoryRate),
              painScore: n(form.painScore), glasgowComaScale: n(form.glasgowComaScale),
            })}
          >
            {mutation.isPending ? "Saving..." : "Submit Triage"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TriageDetailSheet({ record, onSuccess }: { record: any; onSuccess: () => void }) {
  const qc = useQueryClient();
  const [disposition, setDisposition] = useState(record.disposition ?? "");

  const update = useMutation({
    mutationFn: (data: any) => api.patch(`/triage/${record.id}/status`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["triage"] }); onSuccess(); },
  });

  const nextActions: { label: string; status: string; variant?: any }[] = [
    { label: "Start Assessment", status: "IN_ASSESSMENT" },
    { label: "Mark Assessed", status: "ASSESSED" },
    { label: "Admit Patient", status: "ADMITTED" },
    { label: "Discharge", status: "DISCHARGED", variant: "outline" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 px-2">View</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{record.triageNumber}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            {triageBadge(record.triageLevel)}
            {statusBadge(record.status)}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Patient</p>
            <p className="font-medium mt-1">
              {record.patient
                ? `${record.patient.firstName} ${record.patient.lastName} (${record.patient.mrn})`
                : record.walkinName ?? "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Chief Complaint</p>
            <p className="mt-1">{record.chiefComplaint}</p>
          </div>
          {(record.systolicBP || record.heartRate || record.temperature || record.oxygenSaturation) && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Vitals</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {record.systolicBP && <div><span className="text-muted-foreground">BP:</span> {record.systolicBP}/{record.diastolicBP} mmHg</div>}
                {record.heartRate && <div><span className="text-muted-foreground">HR:</span> {record.heartRate} bpm</div>}
                {record.temperature && <div><span className="text-muted-foreground">Temp:</span> {record.temperature}°C</div>}
                {record.oxygenSaturation && <div><span className="text-muted-foreground">SpO₂:</span> {record.oxygenSaturation}%</div>}
                {record.respiratoryRate && <div><span className="text-muted-foreground">RR:</span> {record.respiratoryRate}/min</div>}
                {record.painScore != null && <div><span className="text-muted-foreground">Pain:</span> {record.painScore}/10</div>}
                {record.glasgowComaScale && <div><span className="text-muted-foreground">GCS:</span> {record.glasgowComaScale}</div>}
              </div>
            </div>
          )}
          {record.notes && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Notes</p>
              <p className="text-sm mt-1">{record.notes}</p>
            </div>
          )}
          {record.status !== "DISCHARGED" && record.status !== "ADMITTED" && (
            <div className="border-t pt-4 space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Disposition</Label>
                <Input value={disposition} onChange={(e) => setDisposition(e.target.value)} placeholder="e.g. Admit to ICU, Refer to cardiology" />
              </div>
              <div className="flex flex-col gap-2">
                {nextActions.map((a) => (
                  <Button
                    key={a.status}
                    size="sm"
                    variant={a.variant ?? "default"}
                    disabled={update.isPending}
                    onClick={() => update.mutate({ status: a.status, disposition })}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function TriagePage() {
  const qc = useQueryClient();
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("WAITING");

  const { data: summary } = useQuery({
    queryKey: ["triage-summary"],
    queryFn: () => api.get("/triage/summary").then((r) => r.data),
  });

  const { data: records = [] } = useQuery({
    queryKey: ["triage", levelFilter, statusFilter],
    queryFn: () => api.get("/triage", {
      params: {
        ...(levelFilter !== "ALL" ? { triageLevel: levelFilter } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      },
    }).then((r) => r.data),
    refetchInterval: 30000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["triage"] });
    qc.invalidateQueries({ queryKey: ["triage-summary"] });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Triage</h1>
          <p className="text-muted-foreground">Emergency triage assessment — today&apos;s queue</p>
        </div>
      </div>

      {/* Level cards */}
      <div className="grid gap-3 grid-cols-5">
        {[
          { level: "IMMEDIATE", label: "Immediate", color: "bg-red-600" },
          { level: "EMERGENT", label: "Emergent", color: "bg-orange-500" },
          { level: "URGENT", label: "Urgent", color: "bg-yellow-500" },
          { level: "SEMI_URGENT", label: "Semi-Urgent", color: "bg-green-500" },
          { level: "NON_URGENT", label: "Non-Urgent", color: "bg-blue-400" },
        ].map(({ level, label, color }) => (
          <Card
            key={level}
            className={`cursor-pointer transition-all ${levelFilter === level ? "ring-2 ring-primary" : ""}`}
            onClick={() => setLevelFilter(levelFilter === level ? "ALL" : level)}
          >
            <CardHeader className="pb-1 pt-3 px-3">
              <div className={`h-2 w-2 rounded-full ${color} mb-1`} />
              <CardTitle className="text-xs font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold">
                {level === "IMMEDIATE" ? summary?.immediate :
                 level === "EMERGENT" ? summary?.emergent :
                 level === "URGENT" ? summary?.urgent : "—"}
              </div>
              <p className="text-xs text-muted-foreground">today</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary strip */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.waiting ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Assessment</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.inAssessment ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Today</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.todayTotal ?? 0}</div></CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="WAITING">Waiting</SelectItem>
              <SelectItem value="IN_ASSESSMENT">In Assessment</SelectItem>
              <SelectItem value="ASSESSED">Assessed</SelectItem>
              <SelectItem value="ADMITTED">Admitted</SelectItem>
              <SelectItem value="DISCHARGED">Discharged</SelectItem>
            </SelectContent>
          </Select>
          <TriageFormDialog onSuccess={invalidate} />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Triage #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Chief Complaint</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Vitals</TableHead>
                <TableHead>Waited</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No triage records for today</TableCell></TableRow>
              )}
              {records.map((r: any) => (
                <TableRow key={r.id} className={r.triageLevel === "IMMEDIATE" ? "bg-red-50 dark:bg-red-950/20" : r.triageLevel === "EMERGENT" ? "bg-orange-50 dark:bg-orange-950/20" : ""}>
                  <TableCell className="font-mono text-xs">{r.triageNumber}</TableCell>
                  <TableCell className="font-medium">
                    {r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : r.walkinName ?? "Walk-in"}
                  </TableCell>
                  <TableCell className="text-sm max-w-48 truncate">{r.chiefComplaint}</TableCell>
                  <TableCell>{triageBadge(r.triageLevel)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.systolicBP ? `BP ${r.systolicBP}/${r.diastolicBP}` : ""}
                    {r.heartRate ? ` HR ${r.heartRate}` : ""}
                    {r.oxygenSaturation ? ` SpO₂ ${r.oxygenSaturation}%` : ""}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(r.createdAt), { addSuffix: false })}
                  </TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell><TriageDetailSheet record={r} onSuccess={invalidate} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
