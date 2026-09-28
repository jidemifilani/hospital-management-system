"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
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
import { Plus, FileText, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const CERT_TYPES = [
  "SICK_LEAVE",
  "FITNESS_TO_WORK",
  "MEDICAL_EXAMINATION",
  "VACCINATION",
  "DISABILITY",
  "DEATH_CERTIFICATE",
];

function typeBadge(type: string) {
  const colors: Record<string, string> = {
    SICK_LEAVE: "bg-yellow-100 text-yellow-800",
    FITNESS_TO_WORK: "bg-green-100 text-green-800",
    DEATH_CERTIFICATE: "bg-gray-100 text-gray-800",
    DISABILITY: "bg-purple-100 text-purple-800",
    VACCINATION: "bg-blue-100 text-blue-800",
    MEDICAL_EXAMINATION: "bg-teal-100 text-teal-800",
  };
  return <Badge className={colors[type] ?? "bg-gray-100 text-gray-800"}>{type.replace(/_/g, " ")}</Badge>;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    ISSUED: "bg-green-100 text-green-800",
    REVOKED: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function CreateCertDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("SICK_LEAVE");
  const [form, setForm] = useState({
    patientId: "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    // sick leave
    daysOff: "", startDate: "", endDate: "", diagnosis: "",
    // fitness to work
    fittedForDuty: "true", restrictions: "",
    // death
    deceasedName: "", deathDate: "", causeOfDeath: "", placeOfDeath: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/certificates", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  const submit = () => {
    const payload: any = { type, notes: form.notes, issueDate: form.issueDate, patientId: form.patientId || undefined };
    if (type === "SICK_LEAVE") {
      payload.daysOff = Number(form.daysOff);
      payload.startDate = form.startDate;
      payload.endDate = form.endDate;
      payload.diagnosis = form.diagnosis;
    } else if (type === "FITNESS_TO_WORK") {
      payload.fittedForDuty = form.fittedForDuty === "true";
      payload.restrictions = form.restrictions;
    } else if (type === "DEATH_CERTIFICATE") {
      payload.deceasedName = form.deceasedName;
      payload.deathDate = form.deathDate;
      payload.causeOfDeath = form.causeOfDeath;
      payload.placeOfDeath = form.placeOfDeath;
    }
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Certificate</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Issue Medical Certificate</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Certificate Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CERT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Patient ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Leave blank for walk-in" />
          </div>
          <div className="space-y-1">
            <Label>Issue Date</Label>
            <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
          </div>

          {type === "SICK_LEAVE" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>End Date</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Days Off</Label>
                <Input type="number" value={form.daysOff} onChange={(e) => setForm({ ...form, daysOff: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Diagnosis / Condition</Label>
                <Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
              </div>
            </>
          )}

          {type === "FITNESS_TO_WORK" && (
            <>
              <div className="space-y-1">
                <Label>Fit for Duty?</Label>
                <Select value={form.fittedForDuty} onValueChange={(v) => setForm({ ...form, fittedForDuty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes — Fit for Duty</SelectItem>
                    <SelectItem value="false">No — Not Fit for Duty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Restrictions <span className="text-muted-foreground text-xs">(if any)</span></Label>
                <Input value={form.restrictions} onChange={(e) => setForm({ ...form, restrictions: e.target.value })} placeholder="e.g. No heavy lifting" />
              </div>
            </>
          )}

          {type === "DEATH_CERTIFICATE" && (
            <>
              <div className="space-y-1">
                <Label>Deceased Name</Label>
                <Input value={form.deceasedName} onChange={(e) => setForm({ ...form, deceasedName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Date of Death</Label>
                <Input type="date" value={form.deathDate} onChange={(e) => setForm({ ...form, deathDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Cause of Death</Label>
                <Input value={form.causeOfDeath} onChange={(e) => setForm({ ...form, causeOfDeath: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Place of Death</Label>
                <Input value={form.placeOfDeath} onChange={(e) => setForm({ ...form, placeOfDeath: e.target.value })} />
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <Button className="w-full" disabled={mutation.isPending} onClick={submit}>
            {mutation.isPending ? "Creating..." : "Create Certificate"}
          </Button>
          {mutation.isError && <p className="text-xs text-red-600">{apiErrorMessage(mutation.error, "Something went wrong")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CertDetailSheet({ cert, open, onClose, onRefresh }: { cert: any; open: boolean; onClose: () => void; onRefresh: () => void }) {
  const [revokeReason, setRevokeReason] = useState("");

  const issue = useMutation({
    mutationFn: () => api.patch(`/certificates/${cert.id}/issue`).then((r) => r.data),
    onSuccess: () => { onRefresh(); },
  });

  const revoke = useMutation({
    mutationFn: () => api.patch(`/certificates/${cert.id}/revoke`, { revokedReason: revokeReason }).then((r) => r.data),
    onSuccess: () => { setRevokeReason(""); onRefresh(); },
  });

  if (!cert) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{cert.certificateNumber}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">{typeBadge(cert.type)}{statusBadge(cert.status)}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-muted p-3">
              {cert.patient && <><span className="text-muted-foreground">Patient</span><span>{cert.patient.firstName} {cert.patient.lastName}</span></>}
              <span className="text-muted-foreground">Issued By</span><span>{cert.issuedBy?.firstName} {cert.issuedBy?.lastName}</span>
              <span className="text-muted-foreground">Issue Date</span><span>{format(new Date(cert.issueDate), "dd MMM yyyy")}</span>
              {cert.expiryDate && <><span className="text-muted-foreground">Expiry</span><span>{format(new Date(cert.expiryDate), "dd MMM yyyy")}</span></>}
              {cert.daysOff != null && <><span className="text-muted-foreground">Days Off</span><span>{cert.daysOff} days</span></>}
              {cert.startDate && <><span className="text-muted-foreground">From</span><span>{format(new Date(cert.startDate), "dd MMM yyyy")}</span></>}
              {cert.endDate && <><span className="text-muted-foreground">To</span><span>{format(new Date(cert.endDate), "dd MMM yyyy")}</span></>}
              {cert.diagnosis && <><span className="text-muted-foreground">Diagnosis</span><span>{cert.diagnosis}</span></>}
              {cert.fittedForDuty != null && <><span className="text-muted-foreground">Fit for Duty</span><span>{cert.fittedForDuty ? "Yes" : "No"}</span></>}
              {cert.restrictions && <><span className="text-muted-foreground">Restrictions</span><span>{cert.restrictions}</span></>}
              {cert.deceasedName && <><span className="text-muted-foreground">Deceased</span><span>{cert.deceasedName}</span></>}
              {cert.causeOfDeath && <><span className="text-muted-foreground">Cause of Death</span><span>{cert.causeOfDeath}</span></>}
              {cert.notes && <><span className="text-muted-foreground">Notes</span><span>{cert.notes}</span></>}
            </div>
          </div>

          {cert.status === "DRAFT" && (
            <div className="flex gap-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => issue.mutate()} disabled={issue.isPending}>
                <CheckCircle className="mr-1 h-4 w-4" />Issue Certificate
              </Button>
            </div>
          )}
          {cert.status === "ISSUED" && (
            <div className="space-y-2">
              <Label className="text-sm">Revoke Reason</Label>
              <Input value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} placeholder="Reason for revocation" />
              <Button size="sm" variant="destructive" onClick={() => revoke.mutate()} disabled={!revokeReason || revoke.isPending}>
                <XCircle className="mr-1 h-4 w-4" />Revoke
              </Button>
            </div>
          )}
          {cert.status === "REVOKED" && cert.revokedReason && (
            <div className="rounded-md bg-red-50 p-3 text-sm">
              <p className="font-medium text-red-700">Revoked</p>
              <p className="text-red-600">{cert.revokedReason}</p>
              {cert.revokedAt && <p className="text-xs text-red-400 mt-1">{format(new Date(cert.revokedAt), "dd MMM yyyy HH:mm")}</p>}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function CertificatesPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<any>(null);

  const { data: summary } = useQuery({
    queryKey: ["cert-summary"],
    queryFn: () => api.get("/certificates/summary").then((r) => r.data),
  });

  const { data: certs = [], refetch } = useQuery({
    queryKey: ["certificates", typeFilter, statusFilter],
    queryFn: () => api.get("/certificates", { params: { ...(typeFilter !== "ALL" && { type: typeFilter }), ...(statusFilter !== "ALL" && { status: statusFilter }) } }).then((r) => r.data),
  });

  const invalidate = () => { refetch(); qc.invalidateQueries({ queryKey: ["cert-summary"] }); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medical Certificates</h1>
          <p className="text-muted-foreground">Issue and manage medical certificates</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Issued</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.issued ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sick Leave</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.sickLeave ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fitness to Work</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.fitnessToWork ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Draft / Pending</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.draft ?? 0}</div></CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {CERT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ISSUED">Issued</SelectItem>
            <SelectItem value="REVOKED">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <CreateCertDialog onSuccess={invalidate} />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cert #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Issued By</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certs.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No certificates found</TableCell></TableRow>
            )}
            {certs.map((c: any) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(c)}>
                <TableCell className="font-mono text-xs">{c.certificateNumber}</TableCell>
                <TableCell>{typeBadge(c.type)}</TableCell>
                <TableCell>{c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : c.deceasedName ?? "—"}</TableCell>
                <TableCell className="text-sm">{c.issuedBy?.firstName} {c.issuedBy?.lastName}</TableCell>
                <TableCell className="text-sm">{format(new Date(c.issueDate), "dd MMM yyyy")}</TableCell>
                <TableCell>{statusBadge(c.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {selected && (
        <CertDetailSheet cert={selected} open={!!selected} onClose={() => setSelected(null)} onRefresh={invalidate} />
      )}
    </div>
  );
}

