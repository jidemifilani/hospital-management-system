"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus, Search, ArrowRightLeft, AlertTriangle, CheckCircle2,
  Loader2, MoreHorizontal, Download,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { exportToCsv } from "@/lib/csv-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface Referral {
  id: string; referralNumber: string; type: string; urgency: string; status: string;
  reason: string; notes?: string; toFacility?: string; createdAt: string;
  patient: { id: string; firstName: string; lastName: string; mrn: string };
  referredBy: { firstName: string; lastName: string; specialization?: string };
  toStaff?: { firstName: string; lastName: string; specialization?: string } | null;
  toDepartment?: { name: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:   "bg-amber-100 text-amber-800",
  ACCEPTED:  "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  DECLINED:  "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const URGENCY_COLOR: Record<string, string> = {
  ROUTINE:   "border-gray-300 text-gray-600",
  URGENT:    "border-amber-400 text-amber-700",
  EMERGENCY: "border-red-400 text-red-700",
};

// ── Create Referral Dialog ─────────────────────────────────────────────────────
function CreateReferralDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<"patient" | "details">("patient");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({
    type: "INTERNAL", urgency: "ROUTINE", reason: "", notes: "",
    toDepartmentId: "", toFacility: "",
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: patientResults = [] } = useQuery({
    queryKey: ["ref-patient-search", patientSearch],
    queryFn: () => api.get("/patients", { params: { search: patientSearch, limit: 6 } }).then((r: any) => r.data.data ?? []),
    enabled: patientSearch.length >= 2,
  });

  const { data: departments = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["departments-ref"],
    queryFn: () => api.get("/departments").then((r: any) => r.data?.data ?? r.data ?? []),
  });

  const create = useMutation({
    mutationFn: (payload: any) => api.post("/referrals", payload),
    onSuccess: () => {
      toast({ title: "Referral created" });
      qc.invalidateQueries({ queryKey: ["referrals"] });
      qc.invalidateQueries({ queryKey: ["referrals-summary"] });
      onSuccess(); onClose();
      setStep("patient"); setSelectedPatient(null); setPatientSearch("");
      setForm({ type: "INTERNAL", urgency: "ROUTINE", reason: "", notes: "", toDepartmentId: "", toFacility: "" });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Failed", variant: "destructive" }),
  });

  function submit() {
    if (!selectedPatient || !form.reason) {
      toast({ title: "Patient and reason are required", variant: "destructive" }); return;
    }
    create.mutate({
      patientId: selectedPatient.id,
      type: form.type,
      urgency: form.urgency,
      reason: form.reason,
      notes: form.notes || undefined,
      toDepartmentId: form.type === "INTERNAL" && form.toDepartmentId ? form.toDepartmentId : undefined,
      toFacility: form.type === "EXTERNAL" ? form.toFacility : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Referral</DialogTitle></DialogHeader>

        {step === "patient" ? (
          <div className="space-y-4">
            <div>
              <Label>Search Patient</Label>
              <Input placeholder="Name or MRN…" value={patientSearch}
                onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatient(null); }}
                className="mt-1"
              />
            </div>
            {selectedPatient && (
              <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">Selected: <strong>{selectedPatient.name}</strong></p>
            )}
            {patientResults.length > 0 && !selectedPatient && (
              <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                {patientResults.map((p: any) => (
                  <button key={p.id} type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                    onClick={() => { setSelectedPatient({ id: p.id, name: `${p.firstName} ${p.lastName}` }); setPatientSearch(`${p.firstName} ${p.lastName}`); }}
                  >
                    <span>{p.firstName} {p.lastName}</span>
                    <span className="text-muted-foreground">{p.mrn}</span>
                  </button>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button disabled={!selectedPatient} onClick={() => setStep("details")}>Next →</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="EXTERNAL">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Urgency</Label>
                <Select value={form.urgency} onValueChange={(v) => setForm((f) => ({ ...f, urgency: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROUTINE">Routine</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.type === "INTERNAL" ? (
              <div>
                <Label>Refer to Department</Label>
                <Select value={form.toDepartmentId} onValueChange={(v) => setForm((f) => ({ ...f, toDepartmentId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select department…" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>External Facility</Label>
                <Input placeholder="Facility name…" value={form.toFacility}
                  onChange={(e) => setForm((f) => ({ ...f, toFacility: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label>Reason for Referral *</Label>
              <Textarea placeholder="Clinical reason, symptoms, findings…"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="mt-1 resize-none" rows={3}
              />
            </div>
            <div>
              <Label>Additional Notes</Label>
              <Textarea placeholder="Medications, allergies, special instructions…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1 resize-none" rows={2}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("patient")}>← Back</Button>
              <Button onClick={submit} disabled={create.isPending || !form.reason}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Referral
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ReferralsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: summary } = useQuery({
    queryKey: ["referrals-summary"],
    queryFn: () => api.get("/referrals/summary").then((r: any) => r.data),
  });

  const { data, isLoading } = useQuery<{ data: Referral[]; meta: { total: number } }>({
    queryKey: ["referrals", search, statusFilter, typeFilter],
    queryFn: () =>
      api.get("/referrals", {
        params: {
          status: statusFilter === "ALL" ? undefined : statusFilter,
          type: typeFilter === "ALL" ? undefined : typeFilter,
          limit: 50,
        },
      }).then((r: any) => r.data),
  });

  const referrals = (data?.data ?? []).filter((r) =>
    search
      ? `${r.patient.firstName} ${r.patient.lastName} ${r.patient.mrn} ${r.referralNumber}`.toLowerCase().includes(search.toLowerCase())
      : true
  );

  function updateStatus(id: string, status: string) {
    api.patch(`/referrals/${id}/status`, { status })
      .then(() => {
        toast({ title: `Referral ${status.toLowerCase()}` });
        qc.invalidateQueries({ queryKey: ["referrals"] });
        qc.invalidateQueries({ queryKey: ["referrals-summary"] });
      })
      .catch((e: any) => toast({ title: e?.response?.data?.message ?? "Failed", variant: "destructive" }));
  }

  const pending = summary?.byStatus?.find((s: any) => s.status === "PENDING")?._count?.id ?? 0;
  const urgentPending = summary?.urgentPending ?? 0;
  const internal = summary?.byType?.find((s: any) => s.type === "INTERNAL")?._count?.id ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Referrals</h1>
          <p className="text-sm text-muted-foreground">Internal and external patient referrals.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />New Referral
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold">{pending}</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div><p className="text-xs text-muted-foreground">Urgent/Emergency</p><p className="text-2xl font-bold">{urgentPending}</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div><p className="text-xs text-muted-foreground">Internal Referrals</p><p className="text-2xl font-bold">{internal}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patient or ref no…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["ALL","PENDING","ACCEPTED","COMPLETED","DECLINED","CANCELLED"].map((s) => (
              <SelectItem key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="INTERNAL">Internal</SelectItem>
            <SelectItem value="EXTERNAL">External</SelectItem>
          </SelectContent>
        </Select>
        {data && <span className="text-sm text-muted-foreground">{data.meta.total} referrals</span>}
        <Button variant="outline" size="sm" className="gap-1.5" disabled={referrals.length === 0}
          onClick={() => exportToCsv("referrals", referrals.map((r) => ({
            "Ref #": r.referralNumber,
            Patient: `${r.patient.firstName} ${r.patient.lastName}`,
            MRN: r.patient.mrn,
            Type: r.type,
            Urgency: r.urgency,
            Status: r.status,
            "Referred By": `${r.referredBy.firstName} ${r.referredBy.lastName}`,
            To: r.toStaff ? `${r.toStaff.firstName} ${r.toStaff.lastName}` : r.toDepartment?.name ?? r.toFacility ?? "—",
            Reason: r.reason,
            Date: new Date(r.createdAt).toLocaleDateString(),
          })))}
        >
          <Download className="h-4 w-4" />CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Referred To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-muted" /></TableCell>
                  ))}</TableRow>
                ))
              : referrals.length === 0
              ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No referrals found.</TableCell></TableRow>
              : referrals.map((ref) => (
                  <TableRow key={ref.id}>
                    <TableCell className="font-mono text-sm">{ref.referralNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{ref.patient.firstName} {ref.patient.lastName}</p>
                      <p className="text-xs text-muted-foreground">{ref.patient.mrn}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ref.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={URGENCY_COLOR[ref.urgency]}>{ref.urgency}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ref.toStaff
                        ? `Dr. ${ref.toStaff.firstName} ${ref.toStaff.lastName}`
                        : ref.toDepartment?.name
                        ?? ref.toFacility ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLOR[ref.status] ?? "bg-gray-100"}>{ref.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ref.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ref.status === "PENDING" && (
                            <>
                              <DropdownMenuItem onClick={() => updateStatus(ref.id, "ACCEPTED")}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />Accept
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(ref.id, "DECLINED")}>
                                Decline
                              </DropdownMenuItem>
                            </>
                          )}
                          {ref.status === "ACCEPTED" && (
                            <DropdownMenuItem onClick={() => updateStatus(ref.id, "COMPLETED")}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />Mark Completed
                            </DropdownMenuItem>
                          )}
                          {["PENDING", "ACCEPTED"].includes(ref.status) && (
                            <DropdownMenuItem className="text-red-600" onClick={() => updateStatus(ref.id, "CANCELLED")}>
                              Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <CreateReferralDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
