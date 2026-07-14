"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle, ShieldAlert, CheckCircle2, FileWarning, Plus, Loader2,
  MoreHorizontal, Download,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { exportToCsv } from "@/lib/csv-export";

interface Incident {
  id: string; incidentNumber: string; title: string; description: string;
  severity: string; status: string; incidentDate: string; rootCause?: string;
  correctiveAction?: string; resolvedAt?: string; createdAt: string;
  reportedBy: { firstName: string; lastName: string };
  assignedTo?: { firstName: string; lastName: string };
  patient?: { firstName: string; lastName: string; mrn: string };
  department?: { name: string };
}

interface Summary { open: number; underReview: number; resolved: number; critical: number; high: number }

const SEVERITY_COLOR: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MODERATE: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

function ReportDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: "", description: "", severity: "LOW",
    incidentDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    patientSearch: "", patientId: "", departmentId: "",
  });
  const { toast } = useToast();

  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ["inc-patient-search", form.patientSearch],
    queryFn: () => api.get(`/patients?search=${encodeURIComponent(form.patientSearch)}&limit=5`).then((r) => r.data.data ?? []),
    enabled: form.patientSearch.length >= 2,
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["departments-list"],
    queryFn: () => api.get("/departments").then((r) => r.data.data ?? r.data),
  });

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: () => api.post("/incidents", {
      title: form.title,
      description: form.description,
      severity: form.severity,
      incidentDate: form.incidentDate,
      patientId: form.patientId || undefined,
      departmentId: form.departmentId || undefined,
    }),
    onSuccess: () => { toast({ title: "Incident reported" }); onSuccess(); onClose(); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Failed", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title *</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => f("title", e.target.value)} placeholder="Brief incident title" />
          </div>
          <div>
            <Label className="text-xs">Description *</Label>
            <Textarea className="mt-1 h-24 resize-none" value={form.description} onChange={(e) => f("description", e.target.value)} placeholder="Describe what happened…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Severity *</Label>
              <Select value={form.severity} onValueChange={(v) => f("severity", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["LOW", "MODERATE", "HIGH", "CRITICAL"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Incident Date *</Label>
              <Input type="datetime-local" className="mt-1" value={form.incidentDate} onChange={(e) => f("incidentDate", e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Department</Label>
            <Select value={form.departmentId} onValueChange={(v) => f("departmentId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select department (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Patient Involved (optional)</Label>
            <Input className="mt-1" placeholder="Search name or MRN…" value={form.patientSearch} onChange={(e) => f("patientSearch", e.target.value)} />
            {patients.length > 0 && !form.patientId && (
              <div className="mt-1 rounded-lg border shadow-sm bg-white">
                {patients.map((p: any) => (
                  <button key={p.id} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60 flex justify-between"
                    onClick={() => { f("patientId", p.id); f("patientSearch", `${p.firstName} ${p.lastName} (${p.mrn})`); }}>
                    <span>{p.firstName} {p.lastName}</span>
                    <span className="text-xs text-muted-foreground font-mono">{p.mrn}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title || !form.description}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateSheet({ incident, onClose, onSuccess }: { incident: Incident; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    status: incident.status,
    rootCause: incident.rootCause ?? "",
    correctiveAction: incident.correctiveAction ?? "",
  });
  const { toast } = useToast();

  const update = useMutation({
    mutationFn: () => api.patch(`/incidents/${incident.id}`, {
      status: form.status,
      rootCause: form.rootCause || undefined,
      correctiveAction: form.correctiveAction || undefined,
    }),
    onSuccess: () => { toast({ title: "Incident updated" }); onSuccess(); onClose(); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Failed", variant: "destructive" }),
  });

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{incident.incidentNumber}</SheetTitle>
          <div className="flex gap-2 mt-1">
            <Badge className={SEVERITY_COLOR[incident.severity]}>{incident.severity}</Badge>
            <Badge className={STATUS_COLOR[incident.status]}>{incident.status.replace(/_/g, " ")}</Badge>
          </div>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="font-semibold">{incident.title}</p>
            <p className="mt-1 text-muted-foreground">{incident.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div><span className="font-medium text-foreground">Date:</span> {format(new Date(incident.incidentDate), "dd MMM yyyy HH:mm")}</div>
            <div><span className="font-medium text-foreground">Reported by:</span> {incident.reportedBy.firstName} {incident.reportedBy.lastName}</div>
            {incident.department && <div><span className="font-medium text-foreground">Department:</span> {incident.department.name}</div>}
            {incident.patient && <div><span className="font-medium text-foreground">Patient:</span> {incident.patient.firstName} {incident.patient.lastName}</div>}
          </div>
          <div>
            <Label className="text-xs">Update Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"].map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Root Cause</Label>
            <Textarea className="mt-1 h-20 resize-none" value={form.rootCause} onChange={(e) => setForm((p) => ({ ...p, rootCause: e.target.value }))} placeholder="Describe the root cause…" />
          </div>
          <div>
            <Label className="text-xs">Corrective Action</Label>
            <Textarea className="mt-1 h-20 resize-none" value={form.correctiveAction} onChange={(e) => setForm((p) => ({ ...p, correctiveAction: e.target.value }))} placeholder="Steps taken to resolve…" />
          </div>
          <Button className="w-full" onClick={() => update.mutate()} disabled={update.isPending}>
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function IncidentsPage() {
  const [showReport, setShowReport] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: summary } = useQuery<Summary>({
    queryKey: ["incidents-summary"],
    queryFn: () => api.get("/incidents/summary").then((r) => r.data),
  });

  const { data: incidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ["incidents", statusFilter, severityFilter],
    queryFn: () => api.get("/incidents", { params: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(severityFilter ? { severity: severityFilter } : {}),
    }}).then((r) => r.data),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["incidents"] });
    qc.invalidateQueries({ queryKey: ["incidents-summary"] });
  };

  const handleExport = () => {
    exportToCsv("incidents", incidents.map((i) => ({
      "Incident #": i.incidentNumber,
      "Title": i.title,
      "Severity": i.severity,
      "Status": i.status,
      "Date": format(new Date(i.incidentDate), "dd MMM yyyy"),
      "Department": i.department?.name ?? "",
      "Reported By": `${i.reportedBy.firstName} ${i.reportedBy.lastName}`,
    })));
  };

  const KPI = [
    { label: "Open", value: summary?.open ?? 0, icon: FileWarning, color: "text-red-600" },
    { label: "Under Review", value: summary?.underReview ?? 0, icon: AlertTriangle, color: "text-amber-600" },
    { label: "Resolved", value: summary?.resolved ?? 0, icon: CheckCircle2, color: "text-green-600" },
    { label: "Critical", value: summary?.critical ?? 0, icon: ShieldAlert, color: "text-red-800" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incident Reports</h1>
          <p className="text-sm text-muted-foreground">Clinical safety events and incident tracking.</p>
        </div>
        <Button size="sm" onClick={() => setShowReport(true)}>
          <Plus className="mr-2 h-4 w-4" />Report Incident
        </Button>
      </div>

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

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"].map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All severities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All severities</SelectItem>
            {["LOW", "MODERATE", "HIGH", "CRITICAL"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={incidents.length === 0}>
          <Download className="mr-2 h-4 w-4" />Export CSV
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Incident #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Reported By</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-muted" /></TableCell>
                  ))}</TableRow>
                ))
              : incidents.length === 0
              ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No incidents found.</TableCell></TableRow>
              : incidents.map((inc) => (
                  <TableRow key={inc.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(inc)}>
                    <TableCell className="font-mono text-xs font-semibold">{inc.incidentNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{inc.title}</p>
                      {inc.patient && <p className="text-xs text-muted-foreground">{inc.patient.firstName} {inc.patient.lastName}</p>}
                    </TableCell>
                    <TableCell><Badge className={SEVERITY_COLOR[inc.severity]}>{inc.severity}</Badge></TableCell>
                    <TableCell><Badge className={STATUS_COLOR[inc.status]}>{inc.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-sm">{format(new Date(inc.incidentDate), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm">{inc.department?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{inc.reportedBy.firstName} {inc.reportedBy.lastName}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelected(inc)}>View / Update</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {showReport && (
        <ReportDialog open onClose={() => setShowReport(false)} onSuccess={refresh} />
      )}
      {selected && (
        <UpdateSheet incident={selected} onClose={() => setSelected(null)} onSuccess={refresh} />
      )}
    </div>
  );
}
