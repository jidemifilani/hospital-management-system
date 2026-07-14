"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Plus, Loader2, UserCheck, UserX, Trash2, LayoutGrid, List, ArrowRightLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Department { id: string; name: string; }
interface Bed {
  id: string; bedNumber: string; ward: string; isOccupied: boolean;
  patientId?: string; admittedAt?: string; notes?: string;
  department: { id: string; name: string };
}
interface Occupancy {
  total: number; occupied: number; available: number; occupancyRate: number;
  byWard: { ward: string; total: number; occupied: number; available: number }[];
}

function OccupancyCards({ data }: { data: Occupancy }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: "Total Beds", value: data.total, color: "text-foreground" },
        { label: "Occupied", value: data.occupied, color: "text-red-600" },
        { label: "Available", value: data.available, color: "text-green-600" },
        { label: "Occupancy Rate", value: `${data.occupancyRate}%`, color: data.occupancyRate > 85 ? "text-red-600" : "text-amber-600" },
      ].map((s) => (
        <Card key={s.label}>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AddBedDialog({ departments, onClose }: { departments: Department[]; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ bedNumber: "", ward: "", departmentId: "", notes: "" });

  const create = useMutation({
    mutationFn: () => api.post("/beds", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beds"] });
      qc.invalidateQueries({ queryKey: ["beds-occupancy"] });
      toast({ title: "Bed added" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Bed</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Bed Number *</Label>
              <Input placeholder="e.g. A-01" value={form.bedNumber} onChange={(e) => setForm({ ...form, bedNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ward *</Label>
              <Input placeholder="e.g. General Ward" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Department *</Label>
            <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Input placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.bedNumber || !form.ward || !form.departmentId}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Bed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ bed, allBeds, onClose }: { bed: Bed; allBeds: Bed[]; onClose: () => void }) {
  const [targetBedId, setTargetBedId] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const available = allBeds.filter((b) => !b.isOccupied && b.id !== bed.id);

  const transfer = useMutation({
    mutationFn: () => api.patch(`/beds/${bed.id}/transfer`, { targetBedId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beds"] });
      qc.invalidateQueries({ queryKey: ["beds-occupancy"] });
      toast({ title: `Patient transferred to bed ${allBeds.find((b) => b.id === targetBedId)?.bedNumber}` });
      onClose();
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Transfer failed", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Patient — Bed {bed.bedNumber}</DialogTitle>
          <p className="text-sm text-muted-foreground">Ward: {bed.ward} · {bed.department.name}</p>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Move to Bed</Label>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No available beds to transfer to.</p>
          ) : (
            <Select value={targetBedId} onValueChange={setTargetBedId}>
              <SelectTrigger><SelectValue placeholder="Select target bed…" /></SelectTrigger>
              <SelectContent>
                {available.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.bedNumber} — {b.ward} ({b.department.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => transfer.mutate()} disabled={transfer.isPending || !targetBedId}>
            {transfer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <ArrowRightLeft className="mr-2 h-4 w-4" />Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BedsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [view, setView] = useState<"grid" | "table">("grid");
  const [wardFilter, setWardFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Bed | null>(null);

  const { data: beds = [], isLoading } = useQuery<Bed[]>({
    queryKey: ["beds", wardFilter],
    queryFn: () => api.get("/beds", { params: wardFilter !== "all" ? { ward: wardFilter } : {} }).then((r) => r.data),
  });

  const { data: occupancy } = useQuery<Occupancy>({
    queryKey: ["beds-occupancy"],
    queryFn: () => api.get("/beds/occupancy").then((r) => r.data),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments-list"],
    queryFn: () => api.get("/departments").then((r) => r.data?.data ?? r.data ?? []),
  });

  const discharge = useMutation({
    mutationFn: (id: string) => api.patch(`/beds/${id}/discharge`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beds"] });
      qc.invalidateQueries({ queryKey: ["beds-occupancy"] });
      toast({ title: "Patient discharged from bed" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/beds/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beds"] });
      qc.invalidateQueries({ queryKey: ["beds-occupancy"] });
      toast({ title: "Bed removed" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const wards = ["all", ...Array.from(new Set(beds.map((b) => b.ward)))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bed Management</h1>
          <p className="text-sm text-muted-foreground">Monitor occupancy and manage ward beds</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />Add Bed
        </Button>
      </div>

      {occupancy && <OccupancyCards data={occupancy} />}

      {/* Ward occupancy breakdown */}
      {occupancy && occupancy.byWard.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {occupancy.byWard.map((w) => (
            <Card key={w.ward} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{w.ward}</p>
                  <Badge variant={w.available === 0 ? "destructive" : "secondary"}>
                    {w.available === 0 ? "Full" : `${w.available} free`}
                  </Badge>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${w.occupied / w.total > 0.85 ? "bg-red-500" : w.occupied / w.total > 0.6 ? "bg-amber-500" : "bg-green-500"}`}
                    style={{ width: `${(w.occupied / w.total) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{w.occupied}/{w.total} occupied</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border p-1">
          {wards.map((w) => (
            <button
              key={w}
              onClick={() => setWardFilter(w)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${wardFilter === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {w === "all" ? "All Wards" : w}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setView("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === "table" ? "secondary" : "ghost"} size="icon" onClick={() => setView("table")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {beds.map((bed) => (
            <Card key={bed.id} className={`border-l-4 ${bed.isOccupied ? "border-l-red-400" : "border-l-green-400"}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BedDouble className={`h-4 w-4 shrink-0 ${bed.isOccupied ? "text-red-500" : "text-green-500"}`} />
                    <span className="font-semibold text-sm">{bed.bedNumber}</span>
                  </div>
                  <Badge variant={bed.isOccupied ? "destructive" : "secondary"} className="text-[10px]">
                    {bed.isOccupied ? "Occupied" : "Available"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{bed.ward}</p>
                <p className="text-xs text-muted-foreground">{bed.department.name}</p>
                {bed.notes && <p className="text-xs italic text-muted-foreground">{bed.notes}</p>}
                <div className="flex gap-1 pt-1">
                  {bed.isOccupied ? (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1"
                        onClick={() => discharge.mutate(bed.id)} disabled={discharge.isPending}>
                        <UserX className="mr-1 h-3 w-3" />Discharge
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2"
                        onClick={() => setTransferTarget(bed)} title="Transfer patient">
                        <ArrowRightLeft className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => remove.mutate(bed.id)} disabled={remove.isPending}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bed No.</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admitted</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {beds.map((bed) => (
                <TableRow key={bed.id}>
                  <TableCell className="font-medium">{bed.bedNumber}</TableCell>
                  <TableCell>{bed.ward}</TableCell>
                  <TableCell>{bed.department.name}</TableCell>
                  <TableCell>
                    <Badge variant={bed.isOccupied ? "destructive" : "secondary"}>
                      {bed.isOccupied ? "Occupied" : "Available"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {bed.admittedAt ? new Date(bed.admittedAt).toLocaleDateString("en-NG") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {bed.isOccupied ? (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => discharge.mutate(bed.id)} disabled={discharge.isPending}>
                            <UserX className="mr-1 h-3 w-3" />Discharge
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" title="Transfer patient"
                            onClick={() => setTransferTarget(bed)}>
                            <ArrowRightLeft className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive"
                          onClick={() => remove.mutate(bed.id)} disabled={remove.isPending}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {beds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No beds found. Add beds to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {showAdd && <AddBedDialog departments={departments} onClose={() => setShowAdd(false)} />}
      {transferTarget && (
        <TransferDialog
          bed={transferTarget}
          allBeds={beds}
          onClose={() => setTransferTarget(null)}
        />
      )}
    </div>
  );
}
