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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Building2, LogOut, RotateCcw } from "lucide-react";
import { format } from "date-fns";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ADMITTED: "bg-blue-100 text-blue-800",
    RELEASED: "bg-green-100 text-green-800",
    TRANSFERRED: "bg-yellow-100 text-yellow-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function AdmitDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    deceasedName: "", deathDate: "", causeOfDeath: "", storageUnit: "",
    nextOfKinName: "", nextOfKinPhone: "", nextOfKinRelation: "", patientId: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/mortuary", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); setForm({ deceasedName: "", deathDate: "", causeOfDeath: "", storageUnit: "", nextOfKinName: "", nextOfKinPhone: "", nextOfKinRelation: "", patientId: "" }); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Admit Deceased</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Mortuary Admission</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Deceased Name</Label>
            <Input value={form.deceasedName} onChange={(e) => setForm({ ...form, deceasedName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date of Death</Label>
              <Input value={form.deathDate} onChange={(e) => setForm({ ...form, deathDate: e.target.value })} type="datetime-local" />
            </div>
            <div className="space-y-1">
              <Label>Storage Unit</Label>
              <Input value={form.storageUnit} onChange={(e) => setForm({ ...form, storageUnit: e.target.value })} placeholder="e.g. B-03" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Cause of Death</Label>
            <Input value={form.causeOfDeath} onChange={(e) => setForm({ ...form, causeOfDeath: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Patient ID (if hospital patient)</Label>
            <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Optional" />
          </div>
          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-3">Next of Kin</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={form.nextOfKinName} onChange={(e) => setForm({ ...form, nextOfKinName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.nextOfKinPhone} onChange={(e) => setForm({ ...form, nextOfKinPhone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1 mt-3">
              <Label>Relation</Label>
              <Input value={form.nextOfKinRelation} onChange={(e) => setForm({ ...form, nextOfKinRelation: e.target.value })} placeholder="e.g. Spouse, Child" />
            </div>
          </div>
          <Button
            className="w-full"
            disabled={!form.deceasedName || !form.deathDate || !form.nextOfKinName || !form.nextOfKinPhone || mutation.isPending}
            onClick={() => mutation.mutate({ ...form, patientId: form.patientId || undefined })}
          >
            {mutation.isPending ? "Admitting..." : "Admit Deceased"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReleaseDialog({ record, onSuccess }: { record: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ releasedTo: "", releaseNotes: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => api.patch(`/mortuary/${record.id}/release`, data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  if (record.status !== "ADMITTED") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2"><LogOut className="h-3 w-3 mr-1" />Release</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Release — {record.recordNumber}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Deceased: <span className="font-medium text-foreground">{record.deceasedName}</span></p>
          <div className="space-y-1">
            <Label>Released To</Label>
            <Input value={form.releasedTo} onChange={(e) => setForm({ ...form, releasedTo: e.target.value })} placeholder="Name of person receiving" />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.releaseNotes} onChange={(e) => setForm({ ...form, releaseNotes: e.target.value })} rows={3} />
          </div>
          <Button
            className="w-full"
            disabled={!form.releasedTo || mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            {mutation.isPending ? "Processing..." : "Confirm Release"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MortuaryPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: summary } = useQuery({
    queryKey: ["mortuary-summary"],
    queryFn: () => api.get("/mortuary/summary").then((r) => r.data),
  });

  const { data: records = [] } = useQuery({
    queryKey: ["mortuary-records", statusFilter],
    queryFn: () => api.get("/mortuary", { params: statusFilter !== "ALL" ? { status: statusFilter } : {} }).then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["mortuary-records"] });
    qc.invalidateQueries({ queryKey: ["mortuary-summary"] });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mortuary Management</h1>
          <p className="text-muted-foreground">Deceased admissions, storage and releases</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Currently Admitted</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.admitted ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Released</CardTitle>
            <LogOut className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.released ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transferred</CardTitle>
            <RotateCcw className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.transferred ?? 0}</div></CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Records</SelectItem>
              <SelectItem value="ADMITTED">Admitted</SelectItem>
              <SelectItem value="RELEASED">Released</SelectItem>
              <SelectItem value="TRANSFERRED">Transferred</SelectItem>
            </SelectContent>
          </Select>
          <AdmitDialog onSuccess={invalidate} />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record #</TableHead>
                <TableHead>Deceased Name</TableHead>
                <TableHead>Date of Death</TableHead>
                <TableHead>Storage Unit</TableHead>
                <TableHead>Next of Kin</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Released To</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>
              )}
              {records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.recordNumber}</TableCell>
                  <TableCell className="font-medium">{r.deceasedName}</TableCell>
                  <TableCell className="text-sm">{format(new Date(r.deathDate), "dd MMM yyyy HH:mm")}</TableCell>
                  <TableCell>{r.storageUnit ?? "—"}</TableCell>
                  <TableCell>{r.nextOfKinName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.nextOfKinPhone}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>{r.releasedTo ?? "—"}</TableCell>
                  <TableCell><ReleaseDialog record={r} onSuccess={invalidate} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
