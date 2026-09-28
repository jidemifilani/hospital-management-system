"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Users, Clock, Stethoscope, CheckCircle2, XCircle, Plus, Loader2,
  PhoneCall, RefreshCw, ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

interface QueueEntry {
  id: string; queueNumber: string; status: string; createdAt: string;
  calledAt?: string; consultationStartAt?: string; completedAt?: string;
  patient: { id: string; firstName: string; lastName: string; mrn: string; phone: string };
  department: { id: string; name: string };
  doctor?: { id: string; firstName: string; lastName: string; specialization?: string };
}

interface Department { id: string; name: string }
interface Staff { id: string; firstName: string; lastName: string; specialization?: string }
interface Summary { waiting: number; called: number; inConsultation: number; completed: number; noShow: number; total: number }

const STATUS_COLOR: Record<string, string> = {
  WAITING: "bg-amber-100 text-amber-700",
  CALLED: "bg-blue-100 text-blue-700",
  IN_CONSULTATION: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  NO_SHOW: "bg-red-100 text-red-700",
};

function waitTime(createdAt: string) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function AddToQueueDialog({
  open, onClose, onSuccess,
}: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ patientSearch: "", patientId: "", departmentId: "", doctorId: "", notes: "" });
  const { toast } = useToast();

  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ["opd-patient-search", form.patientSearch],
    queryFn: () => api.get(`/patients?search=${encodeURIComponent(form.patientSearch)}&limit=6`).then((r) => r.data.data ?? []),
    enabled: form.patientSearch.length >= 2,
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments-list"],
    queryFn: () => api.get("/departments").then((r) => r.data.data ?? r.data),
  });

  const { data: doctors = [] } = useQuery<Staff[]>({
    queryKey: ["doctors-list"],
    queryFn: () => api.get("/staff?limit=100").then((r) => r.data.data ?? r.data),
    enabled: !!form.departmentId,
  });

  const enqueue = useMutation({
    mutationFn: () => api.post("/opd-queue", {
      patientId: form.patientId,
      departmentId: form.departmentId,
      doctorId: form.doctorId || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { toast({ title: "Patient added to queue" }); onSuccess(); onClose(); },
    onError: (e: any) => toast({ title: apiErrorMessage(e, "Failed"), variant: "destructive" }),
  });

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Patient to Queue</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Search Patient *</Label>
            <Input
              className="mt-1"
              placeholder="Name or MRN…"
              value={form.patientSearch}
              onChange={(e) => f("patientSearch", e.target.value)}
            />
            {patients.length > 0 && !form.patientId && (
              <div className="mt-1 rounded-lg border shadow-sm bg-white">
                {patients.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60 flex justify-between"
                    onClick={() => { f("patientId", p.id); f("patientSearch", `${p.firstName} ${p.lastName} (${p.mrn})`); }}
                  >
                    <span>{p.firstName} {p.lastName}</span>
                    <span className="text-xs text-muted-foreground font-mono">{p.mrn}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Department *</Label>
            <Select value={form.departmentId} onValueChange={(v) => f("departmentId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Assign Doctor (optional)</Label>
            <Select value={form.doctorId} onValueChange={(v) => f("doctorId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Any available doctor" /></SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    Dr. {d.firstName} {d.lastName}{d.specialization ? ` — ${d.specialization}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input className="mt-1" value={form.notes} onChange={(e) => f("notes", e.target.value)} placeholder="Chief complaint…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => enqueue.mutate()}
            disabled={enqueue.isPending || !form.patientId || !form.departmentId}
          >
            {enqueue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add to Queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OpdQueuePage() {
  const [showAdd, setShowAdd] = useState(false);
  const [deptFilter, setDeptFilter] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: summary } = useQuery<Summary>({
    queryKey: ["opd-summary"],
    queryFn: () => api.get("/opd-queue/summary").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: queue = [], isLoading } = useQuery<QueueEntry[]>({
    queryKey: ["opd-queue", deptFilter],
    queryFn: () => api.get("/opd-queue", { params: deptFilter ? { departmentId: deptFilter } : {} }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments-list"],
    queryFn: () => api.get("/departments").then((r) => r.data.data ?? r.data),
  });

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: string }) => api.patch(`/opd-queue/${id}/${act}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opd-queue"] });
      qc.invalidateQueries({ queryKey: ["opd-summary"] });
    },
    onError: (e: any) => toast({ title: apiErrorMessage(e, "Action failed"), variant: "destructive" }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["opd-queue"] });
    qc.invalidateQueries({ queryKey: ["opd-summary"] });
  };

  const KPI = [
    { label: "Waiting", value: summary?.waiting ?? 0, icon: Clock, color: "text-amber-600" },
    { label: "Called", value: summary?.called ?? 0, icon: PhoneCall, color: "text-blue-600" },
    { label: "In Consultation", value: summary?.inConsultation ?? 0, icon: Stethoscope, color: "text-green-600" },
    { label: "Completed", value: summary?.completed ?? 0, icon: CheckCircle2, color: "text-gray-500" },
  ];

  const active = queue.filter((e) => ["WAITING", "CALLED", "IN_CONSULTATION"].includes(e.status));
  const done = queue.filter((e) => ["COMPLETED", "NO_SHOW"].includes(e.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">OPD Queue</h1>
          <p className="text-sm text-muted-foreground">Outpatient department patient flow management.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" />Add Patient</Button>
        </div>
      </div>

      {/* KPI cards */}
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

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All departments</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{active.length} active · {done.length} done today</p>
      </div>

      {/* Active queue */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Active Queue</h2>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p>No patients in queue right now.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((entry) => (
              <Card key={entry.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold font-mono text-primary">{entry.queueNumber}</span>
                      <Badge className={STATUS_COLOR[entry.status] ?? ""}>{entry.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">Action <ChevronRight className="ml-1 h-3 w-3" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {entry.status === "WAITING" && (
                          <DropdownMenuItem onClick={() => action.mutate({ id: entry.id, act: "call" })}>
                            <PhoneCall className="mr-2 h-4 w-4" />Call Patient
                          </DropdownMenuItem>
                        )}
                        {entry.status === "CALLED" && (
                          <DropdownMenuItem onClick={() => action.mutate({ id: entry.id, act: "start" })}>
                            <Stethoscope className="mr-2 h-4 w-4" />Start Consultation
                          </DropdownMenuItem>
                        )}
                        {entry.status === "IN_CONSULTATION" && (
                          <DropdownMenuItem onClick={() => action.mutate({ id: entry.id, act: "complete" })}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />Complete
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => action.mutate({ id: entry.id, act: "no-show" })}
                        >
                          <XCircle className="mr-2 h-4 w-4" />Mark No-Show
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="font-semibold text-sm">{entry.patient.firstName} {entry.patient.lastName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{entry.patient.mrn}</p>
                  <p className="text-xs text-muted-foreground mt-1">{entry.department.name}</p>
                  {entry.doctor && (
                    <p className="text-xs text-muted-foreground">Dr. {entry.doctor.firstName} {entry.doctor.lastName}</p>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Waiting {waitTime(entry.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Done today */}
      {done.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Completed Today</h2>
          <div className="rounded-xl border divide-y text-sm">
            {done.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-muted-foreground">{entry.queueNumber}</span>
                  <p className="font-medium">{entry.patient.firstName} {entry.patient.lastName}</p>
                  <p className="text-xs text-muted-foreground">{entry.department.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLOR[entry.status]}>{entry.status.replace(/_/g, " ")}</Badge>
                  {entry.completedAt && (
                    <span className="text-xs text-muted-foreground">{format(new Date(entry.completedAt), "HH:mm")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <AddToQueueDialog
          open
          onClose={() => setShowAdd(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
