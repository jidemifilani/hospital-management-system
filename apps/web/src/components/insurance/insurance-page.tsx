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
import { ShieldCheck, Plus, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

const STATUS_OPTIONS = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "PAID"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    PAID: "bg-emerald-100 text-emerald-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status.replace(/_/g, " ")}</Badge>;
}

function CreateClaimDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", provider: "", scheme: "", memberNumber: "", preAuthCode: "", amount: "", notes: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/insurance", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Claim</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Insurance Claim</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Patient ID</Label>
            <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Patient ID" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Provider / HMO</Label>
              <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. NHIS, Axamansard" />
            </div>
            <div className="space-y-1">
              <Label>Scheme</Label>
              <Input value={form.scheme} onChange={(e) => setForm({ ...form, scheme: e.target.value })} placeholder="e.g. Basic, Premium" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Member Number</Label>
              <Input value={form.memberNumber} onChange={(e) => setForm({ ...form, memberNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Pre-auth Code</Label>
              <Input value={form.preAuthCode} onChange={(e) => setForm({ ...form, preAuthCode: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Claim Amount (₦)</Label>
            <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button
            className="w-full"
            disabled={!form.patientId || !form.provider || !form.amount || mutation.isPending}
            onClick={() => mutation.mutate({ ...form, amount: Number(form.amount) })}
          >
            {mutation.isPending ? "Creating..." : "Create Claim"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UpdateStatusDialog({ claim, onSuccess }: { claim: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(claim.status);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => api.patch(`/insurance/${claim.id}/status`, data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2">Update</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Update Claim Status — {claim.claimNumber}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {(status === "APPROVED" || status === "PAID") && (
            <div className="space-y-1">
              <Label>Approved Amount (₦)</Label>
              <Input value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} type="number" />
            </div>
          )}
          {status === "REJECTED" && (
            <div className="space-y-1">
              <Label>Rejection Reason</Label>
              <Input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
            </div>
          )}
          <Button
            className="w-full"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ status, approvedAmount: approvedAmount ? Number(approvedAmount) : undefined, rejectionReason })}
          >
            {mutation.isPending ? "Updating..." : "Update Status"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function InsurancePage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: summary } = useQuery({
    queryKey: ["insurance-summary"],
    queryFn: () => api.get("/insurance/summary").then((r) => r.data),
  });

  const { data: claims = [] } = useQuery({
    queryKey: ["insurance-claims", statusFilter],
    queryFn: () => api.get("/insurance", { params: statusFilter !== "ALL" ? { status: statusFilter } : {} }).then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["insurance-claims"] });
    qc.invalidateQueries({ queryKey: ["insurance-summary"] });
  };

  const fmt = (n: number) => `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insurance / HMO Claims</h1>
          <p className="text-muted-foreground">Track and manage insurance claim submissions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary?.submitted ?? 0) + (summary?.underReview ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{fmt(summary?.totalPendingAmount ?? 0)} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.approved ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.paid ?? 0}</div>
            <p className="text-xs text-muted-foreground">{fmt(summary?.totalPaidAmount ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{summary?.rejected ?? 0}</div></CardContent>
        </Card>
      </div>

      {/* Claims Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <CreateClaimDialog onSuccess={invalidate} />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Scheme</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No claims found</TableCell></TableRow>
              )}
              {claims.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.claimNumber}</TableCell>
                  <TableCell>{c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—"}</TableCell>
                  <TableCell>{c.provider}</TableCell>
                  <TableCell>{c.scheme ?? "—"}</TableCell>
                  <TableCell>{fmt(c.amount)}</TableCell>
                  <TableCell>{c.approvedAmount ? fmt(c.approvedAmount) : "—"}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(c.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell><UpdateStatusDialog claim={c} onSuccess={invalidate} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
