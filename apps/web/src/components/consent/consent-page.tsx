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
import { FilePenLine, Plus, PenLine, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CONSENT_TYPES = ["SURGICAL","ANAESTHESIA","BLOOD_TRANSFUSION","RESEARCH","PHOTOGRAPHY","PROCEDURE","GENERAL"];
const STATUSES = ["PENDING","SIGNED","DECLINED","REVOKED"];

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  SIGNED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  DECLINED: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  REVOKED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function ConsentPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [patientId, setPatientId] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [signForm, setSignForm] = useState({ witnessName: "", witnessRelation: "" });
  const [revokeReason, setRevokeReason] = useState("");

  const [form, setForm] = useState({ patientId: "", procedureName: "", consentType: "GENERAL", consentText: "", notes: "" });

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (typeFilter !== "all") params.set("consentType", typeFilter);
  if (patientId) params.set("patientId", patientId);

  const { data: consents = [] } = useQuery({
    queryKey: ["consent", statusFilter, typeFilter, patientId],
    queryFn: () => api.get(`/consent?${params}`).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["consent-summary"],
    queryFn: () => api.get("/consent/summary").then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["consent"] });
    qc.invalidateQueries({ queryKey: ["consent-summary"] });
  };

  const create = useMutation({
    mutationFn: (data: any) => api.post("/consent", data).then((r) => r.data),
    onSuccess: () => { invalidate(); setAddOpen(false); setForm({ patientId: "", procedureName: "", consentType: "GENERAL", consentText: "", notes: "" }); },
  });

  const sign = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/consent/${id}/sign`, data).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); setSignForm({ witnessName: "", witnessRelation: "" }); },
  });

  const revoke = useMutation({
    mutationFn: ({ id, reason }: any) => api.patch(`/consent/${id}/revoke`, { reason }).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); setRevokeReason(""); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/consent/${id}/status`, { status }).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); },
  });

  const openSheet = (c: any) => { setSelected(c); setSheetOpen(true); setSignForm({ witnessName: "", witnessRelation: "" }); setRevokeReason(""); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FilePenLine className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Patient Consent</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Consent Form</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Consent Form</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Patient ID</Label>
                <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Patient ID" />
              </div>
              <div className="space-y-1">
                <Label>Procedure / Purpose</Label>
                <Input value={form.procedureName} onChange={(e) => setForm({ ...form, procedureName: e.target.value })} placeholder="e.g. Appendectomy" />
              </div>
              <div className="space-y-1">
                <Label>Consent Type</Label>
                <Select value={form.consentType} onValueChange={(v) => setForm({ ...form, consentType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONSENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Consent Text</Label>
                <Textarea rows={3} value={form.consentText} onChange={(e) => setForm({ ...form, consentText: e.target.value })} placeholder="I, the undersigned, consent to…" />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes…" />
              </div>
              <Button className="w-full" onClick={() => create.mutate(form)} disabled={create.isPending || !form.patientId || !form.procedureName}>
                Create
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
            { label: "Signed", value: summary.signed, color: "text-green-600" },
            { label: "Surgical", value: summary.surgical, color: "text-primary" },
            { label: "Declined / Revoked", value: summary.declined + summary.revoked, color: "text-red-600" },
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CONSENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Patient ID…" value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-44" />
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consent #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Procedure</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consents.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No consent forms found</TableCell></TableRow>
            ) : consents.map((c: any) => (
              <TableRow key={c.id} className={c.status === "PENDING" ? "bg-yellow-50/30 dark:bg-yellow-950/10" : ""}>
                <TableCell className="font-mono text-xs">{c.consentNumber}</TableCell>
                <TableCell className="text-sm">{c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—"}</TableCell>
                <TableCell className="font-medium text-sm">{c.procedureName}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{c.consentType.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell className="text-sm">{c.requestedBy ? `${c.requestedBy.firstName} ${c.requestedBy.lastName}` : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</TableCell>
                <TableCell><Badge className={statusColors[c.status] ?? ""}>{c.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => openSheet(c)}>View</Button></TableCell>
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
                  <FilePenLine className="h-5 w-5" />{selected.consentNumber}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{selected.patient?.firstName} {selected.patient?.lastName}</span></div>
                  {selected.patient?.mrn && <div className="flex justify-between"><span className="text-muted-foreground">MRN</span><span className="font-mono">{selected.patient.mrn}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Procedure</span><span className="font-medium">{selected.procedureName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="outline">{selected.consentType.replace(/_/g, " ")}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[selected.status] ?? ""}>{selected.status}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Requested by</span><span>{selected.requestedBy?.firstName} {selected.requestedBy?.lastName}</span></div>
                  {selected.signedAt && <div className="flex justify-between"><span className="text-muted-foreground">Signed</span><span>{formatDistanceToNow(new Date(selected.signedAt), { addSuffix: true })}</span></div>}
                  {selected.witnessName && <div className="flex justify-between"><span className="text-muted-foreground">Witness</span><span>{selected.witnessName} ({selected.witnessRelation})</span></div>}
                  {selected.revokedReason && <div className="pt-1 border-t"><p className="text-xs text-muted-foreground">Revoke Reason</p><p className="mt-1">{selected.revokedReason}</p></div>}
                  {selected.consentText && <div className="pt-1 border-t"><p className="text-xs text-muted-foreground">Consent Text</p><p className="mt-1 text-xs italic">{selected.consentText}</p></div>}
                </div>

                {selected.status === "PENDING" && (
                  <>
                    <div className="rounded-lg border p-4 space-y-3">
                      <p className="text-sm font-medium">Sign Consent</p>
                      <div className="space-y-1"><Label>Witness Name</Label><Input value={signForm.witnessName} onChange={(e) => setSignForm({ ...signForm, witnessName: e.target.value })} placeholder="Witness full name" /></div>
                      <div className="space-y-1"><Label>Witness Relation</Label><Input value={signForm.witnessRelation} onChange={(e) => setSignForm({ ...signForm, witnessRelation: e.target.value })} placeholder="e.g. Spouse, Parent" /></div>
                      <Button className="w-full" size="sm" onClick={() => sign.mutate({ id: selected.id, data: signForm })} disabled={sign.isPending}>
                        <PenLine className="mr-2 h-4 w-4" />Mark as Signed
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => updateStatus.mutate({ id: selected.id, status: "DECLINED" })} disabled={updateStatus.isPending}>
                      Mark as Declined
                    </Button>
                  </>
                )}

                {selected.status === "SIGNED" && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="text-sm font-medium">Revoke Consent</p>
                    <Textarea rows={2} placeholder="Reason for revocation…" value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
                    <Button variant="outline" size="sm" className="w-full text-destructive" onClick={() => revoke.mutate({ id: selected.id, reason: revokeReason })} disabled={revoke.isPending}>
                      <XCircle className="mr-2 h-4 w-4" />Revoke
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
