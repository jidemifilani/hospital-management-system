"use client";

import { useState, useEffect } from "react";
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
import { Plus, Users, AlertTriangle, LogOut, UserCheck } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const ID_TYPES = ["NIN", "Passport", "Driver's License", "Voter's Card", "Staff ID"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    CHECKED_IN: "bg-green-100 text-green-800",
    CHECKED_OUT: "bg-gray-100 text-gray-800",
    OVERSTAY: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status.replace(/_/g, " ")}</Badge>;
}

function CheckInDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", relationship: "",
    idType: "", idNumber: "", patientId: "", visitPurpose: "", notes: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/visitors", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); setForm({ firstName: "", lastName: "", phone: "", relationship: "", idType: "", idNumber: "", patientId: "", visitPurpose: "", notes: "" }); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Check In Visitor</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Visitor Check-In</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Relationship to Patient</Label>
              <Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="e.g. Spouse, Sibling" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ID Type</Label>
              <Select value={form.idType} onValueChange={(v) => setForm({ ...form, idType: v })}>
                <SelectTrigger><SelectValue placeholder="Select ID" /></SelectTrigger>
                <SelectContent>{ID_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>ID Number</Label>
              <Input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Patient ID / MRN</Label>
            <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Patient to visit" />
          </div>
          <div className="space-y-1">
            <Label>Purpose of Visit</Label>
            <Input value={form.visitPurpose} onChange={(e) => setForm({ ...form, visitPurpose: e.target.value })} placeholder="e.g. General visit, post-op check" />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button
            className="w-full"
            disabled={!form.firstName || !form.lastName || !form.patientId || mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            {mutation.isPending ? "Checking In..." : "Check In"}
          </Button>
          {mutation.isError && <p className="text-xs text-red-600">{apiErrorMessage(mutation.error, "Something went wrong")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VisitorsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("CHECKED_IN");
  const [dateFilter, setDateFilter] = useState("");

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ["visitors-summary"],
    queryFn: () => api.get("/visitors/summary").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: visitors = [], refetch } = useQuery({
    queryKey: ["visitors", statusFilter, dateFilter],
    queryFn: () => api.get("/visitors", { params: { ...(statusFilter !== "ALL" && { status: statusFilter }), ...(dateFilter && { date: dateFilter }) } }).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const checkOut = useMutation({
    mutationFn: (id: string) => api.patch(`/visitors/${id}/checkout`).then((r) => r.data),
    onSuccess: () => { refetch(); refetchSummary(); },
  });

  const flagOverstay = useMutation({
    mutationFn: () => api.post("/visitors/flag-overstay").then((r) => r.data),
    onSuccess: () => { refetch(); refetchSummary(); },
  });

  const invalidate = () => { refetch(); refetchSummary(); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visitor Management</h1>
          <p className="text-muted-foreground">Patient visitor log and check-in/check-out tracking</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => flagOverstay.mutate()} disabled={flagOverstay.isPending}>
          <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />Flag Overstay
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Currently Inside</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.currentlyIn ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Today</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.todayTotal ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overstay Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary?.overstay ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="CHECKED_IN">Checked In</SelectItem>
            <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
            <SelectItem value="OVERSTAY">Overstay</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-40"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        {dateFilter && (
          <Button size="sm" variant="ghost" onClick={() => setDateFilter("")} className="text-xs">Clear date</Button>
        )}
        <div className="ml-auto">
          <CheckInDialog onSuccess={invalidate} />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Relationship</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visitors.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No visitors found</TableCell></TableRow>
            )}
            {visitors.map((v: any) => (
              <TableRow key={v.id} className={v.status === "OVERSTAY" ? "bg-red-50 dark:bg-red-950/10" : ""}>
                <TableCell className="font-mono text-xs">{v.visitorNumber}</TableCell>
                <TableCell className="font-medium">{v.firstName} {v.lastName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.phone ?? "—"}</TableCell>
                <TableCell className="text-sm">{v.relationship ?? "—"}</TableCell>
                <TableCell className="text-sm">{v.patient ? `${v.patient.firstName} ${v.patient.lastName}` : "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">{v.visitPurpose ?? "—"}</TableCell>
                <TableCell className="text-sm">{format(new Date(v.checkInTime), "HH:mm")}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {v.checkOutTime
                    ? `${Math.round((new Date(v.checkOutTime).getTime() - new Date(v.checkInTime).getTime()) / 60000)} min`
                    : formatDistanceToNow(new Date(v.checkInTime), { addSuffix: false })}
                </TableCell>
                <TableCell>{statusBadge(v.status)}</TableCell>
                <TableCell>
                  {(v.status === "CHECKED_IN" || v.status === "OVERSTAY") && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => checkOut.mutate(v.id)} disabled={checkOut.isPending}>
                      <LogOut className="h-3 w-3 mr-1" />Check Out
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
