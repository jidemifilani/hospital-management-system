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
import { ShieldAlert, Plus, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ALERT_TYPES = ["ALLERGY","FALL_RISK","INFECTION_CONTROL","DNR","DIET_RESTRICTION","MEDICATION","BLOOD_TRANSFUSION","OTHER"];
const SEVERITIES = ["LOW","MODERATE","HIGH","CRITICAL"];

const severityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  MODERATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const typeColors: Record<string, string> = {
  ALLERGY: "bg-red-50 dark:bg-red-950/20",
  DNR: "bg-gray-50 dark:bg-gray-900/20",
  INFECTION_CONTROL: "bg-yellow-50 dark:bg-yellow-950/20",
  FALL_RISK: "bg-orange-50 dark:bg-orange-950/20",
};

export function AlertsPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [resolveReason, setResolveReason] = useState("");

  const [form, setForm] = useState({ patientId: "", type: "ALLERGY", severity: "MODERATE", title: "", description: "" });

  const params = new URLSearchParams({ active: showResolved ? "false" : "true" });
  if (typeFilter !== "all") params.set("type", typeFilter);
  if (severityFilter !== "all") params.set("severity", severityFilter);
  if (patientId) params.set("patientId", patientId);

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts", typeFilter, severityFilter, showResolved, patientId],
    queryFn: () => api.get(`/alerts?${params}`).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["alerts-summary"],
    queryFn: () => api.get("/alerts/summary").then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["alerts"] });
    qc.invalidateQueries({ queryKey: ["alerts-summary"] });
  };

  const create = useMutation({
    mutationFn: (data: any) => api.post("/alerts", data).then((r) => r.data),
    onSuccess: () => { invalidate(); setAddOpen(false); setForm({ patientId: "", type: "ALLERGY", severity: "MODERATE", title: "", description: "" }); },
  });

  const resolve = useMutation({
    mutationFn: ({ id, reason }: any) => api.patch(`/alerts/${id}/resolve`, { reason }).then((r) => r.data),
    onSuccess: () => { invalidate(); setSelected(null); setSheetOpen(false); setResolveReason(""); },
  });

  const openSheet = (alert: any) => { setSelected(alert); setSheetOpen(true); setResolveReason(""); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Patient Alerts</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Alert</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Patient Alert</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Patient ID</Label>
                <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Patient ID" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Alert Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ALERT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Severity</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Penicillin allergy" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Additional details…" />
              </div>
              <Button className="w-full" onClick={() => create.mutate(form)} disabled={create.isPending || !form.patientId || !form.title}>
                Create Alert
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Active Alerts", value: summary.active, color: "text-primary" },
            { label: "Critical", value: summary.critical, color: "text-red-600" },
            { label: "Allergies", value: summary.allergy, color: "text-orange-600" },
            { label: "Fall Risk", value: summary.fallRisk, color: "text-yellow-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className={value > 0 && (label === "Critical") ? "border-red-200 dark:border-red-800" : ""}>
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3"><p className={`text-2xl font-bold ${color}`}>{value}</p></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ALERT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Patient ID…" value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-48" />
        <Button variant={showResolved ? "default" : "outline"} size="sm" onClick={() => setShowResolved(!showResolved)}>
          {showResolved ? "Showing Resolved" : "Show Active"}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alert #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Age</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No alerts found</TableCell></TableRow>
            ) : alerts.map((alert: any) => (
              <TableRow key={alert.id} className={typeColors[alert.type] ?? ""}>
                <TableCell className="font-mono text-xs">{alert.alertNumber}</TableCell>
                <TableCell className="text-sm">{alert.patient ? `${alert.patient.firstName} ${alert.patient.lastName}` : "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{alert.type.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell><Badge className={severityColors[alert.severity] ?? ""}>{alert.severity}</Badge></TableCell>
                <TableCell className="font-medium">{alert.title}</TableCell>
                <TableCell className="text-sm">{alert.createdBy ? `${alert.createdBy.firstName} ${alert.createdBy.lastName}` : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => openSheet(alert)}>View</Button>
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
                  <ShieldAlert className="h-5 w-5" />
                  {selected.alertNumber}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{selected.patient ? `${selected.patient.firstName} ${selected.patient.lastName}` : "—"}</span></div>
                  {selected.patient?.mrn && <div className="flex justify-between"><span className="text-muted-foreground">MRN</span><span className="font-mono">{selected.patient.mrn}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="outline">{selected.type.replace(/_/g, " ")}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Severity</span><Badge className={severityColors[selected.severity] ?? ""}>{selected.severity}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={selected.isActive ? "destructive" : "secondary"}>{selected.isActive ? "Active" : "Resolved"}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Created by</span><span>{selected.createdBy?.firstName} {selected.createdBy?.lastName}</span></div>
                  <div className="pt-1 border-t"><p className="text-muted-foreground text-xs">Title</p><p className="mt-1 font-medium">{selected.title}</p></div>
                  {selected.description && <div className="pt-1 border-t"><p className="text-muted-foreground text-xs">Description</p><p className="mt-1">{selected.description}</p></div>}
                  {!selected.isActive && selected.resolvedReason && <div className="pt-1 border-t"><p className="text-muted-foreground text-xs">Resolution</p><p className="mt-1">{selected.resolvedReason}</p></div>}
                </div>

                {selected.isActive && (
                  <div className="space-y-3 border rounded-lg p-4">
                    <p className="text-sm font-medium">Resolve Alert</p>
                    <Textarea rows={2} placeholder="Reason for resolving…" value={resolveReason} onChange={(e) => setResolveReason(e.target.value)} />
                    <Button className="w-full" size="sm" onClick={() => resolve.mutate({ id: selected.id, reason: resolveReason })} disabled={resolve.isPending}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />Mark Resolved
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
