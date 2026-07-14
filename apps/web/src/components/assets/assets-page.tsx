"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  SheetTrigger,
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
import { Plus, Wrench, Package, AlertTriangle, DollarSign } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["MEDICAL_EQUIPMENT", "FURNITURE", "IT_EQUIPMENT", "VEHICLE", "LABORATORY", "PHARMACY", "OTHER"];
const STATUSES = ["ACTIVE", "UNDER_MAINTENANCE", "DECOMMISSIONED", "LOST", "STOLEN"];
const MAINT_TYPES = ["PREVENTIVE", "CORRECTIVE", "CALIBRATION", "INSPECTION"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    UNDER_MAINTENANCE: "bg-yellow-100 text-yellow-800",
    DECOMMISSIONED: "bg-gray-100 text-gray-800",
    LOST: "bg-red-100 text-red-800",
    STOLEN: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status.replace(/_/g, " ")}</Badge>;
}

function maintStatusBadge(status: string) {
  const map: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    OVERDUE: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function AddAssetDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "MEDICAL_EQUIPMENT", brand: "", model: "", serialNumber: "",
    purchaseDate: "", purchasePrice: "", warrantyExpiry: "", location: "", notes: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/assets", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Asset</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Register Asset</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Asset Name</Label>
              <Input value={form.name} onChange={f("name")} placeholder="e.g. Ventilator XR-500" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={form.location} onChange={f("location")} placeholder="e.g. Ward B, Room 3" />
            </div>
            <div className="space-y-1">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={f("brand")} />
            </div>
            <div className="space-y-1">
              <Label>Model</Label>
              <Input value={form.model} onChange={f("model")} />
            </div>
            <div className="space-y-1">
              <Label>Serial Number</Label>
              <Input value={form.serialNumber} onChange={f("serialNumber")} />
            </div>
            <div className="space-y-1">
              <Label>Purchase Price (₦)</Label>
              <Input value={form.purchasePrice} onChange={f("purchasePrice")} type="number" />
            </div>
            <div className="space-y-1">
              <Label>Purchase Date</Label>
              <Input value={form.purchaseDate} onChange={f("purchaseDate")} type="date" />
            </div>
            <div className="space-y-1">
              <Label>Warranty Expiry</Label>
              <Input value={form.warrantyExpiry} onChange={f("warrantyExpiry")} type="date" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={f("notes")} rows={2} />
          </div>
          <Button
            className="w-full"
            disabled={!form.name || mutation.isPending}
            onClick={() => mutation.mutate({ ...form, purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined })}
          >
            {mutation.isPending ? "Registering..." : "Register Asset"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssetDetailSheet({ asset, onSuccess }: { asset: any; onSuccess: () => void }) {
  const qc = useQueryClient();
  const [maintForm, setMaintForm] = useState({ type: "PREVENTIVE", scheduledDate: "", notes: "", performedBy: "" });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/assets/${asset.id}`, { status }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); onSuccess(); },
  });

  const scheduleMaint = useMutation({
    mutationFn: (data: any) => api.post(`/assets/${asset.id}/maintenance`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); setMaintForm({ type: "PREVENTIVE", scheduledDate: "", notes: "", performedBy: "" }); onSuccess(); },
  });

  const completeMaint = useMutation({
    mutationFn: (id: string) => api.patch(`/assets/maintenance/${id}/complete`, {}).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); onSuccess(); },
  });

  const fmt = (n: number) => `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2">Detail</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{asset.assetNumber} — {asset.name}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{asset.category.replace(/_/g, " ")}</span></div>
            <div><span className="text-muted-foreground">Status:</span> {statusBadge(asset.status)}</div>
            {asset.brand && <div><span className="text-muted-foreground">Brand:</span> {asset.brand}</div>}
            {asset.model && <div><span className="text-muted-foreground">Model:</span> {asset.model}</div>}
            {asset.serialNumber && <div className="col-span-2"><span className="text-muted-foreground">S/N:</span> {asset.serialNumber}</div>}
            {asset.location && <div><span className="text-muted-foreground">Location:</span> {asset.location}</div>}
            {asset.purchasePrice && <div><span className="text-muted-foreground">Value:</span> {fmt(asset.purchasePrice)}</div>}
            {asset.warrantyExpiry && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Warranty:</span> {format(new Date(asset.warrantyExpiry), "dd MMM yyyy")}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {asset.status === "ACTIVE" && (
              <Button size="sm" variant="outline" className="flex-1" onClick={() => updateStatus.mutate("UNDER_MAINTENANCE")}>
                <Wrench className="mr-1 h-3 w-3" />Send for Maintenance
              </Button>
            )}
            {asset.status === "UNDER_MAINTENANCE" && (
              <Button size="sm" className="flex-1" onClick={() => updateStatus.mutate("ACTIVE")}>
                Mark Active
              </Button>
            )}
            {asset.status === "ACTIVE" && (
              <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={() => updateStatus.mutate("DECOMMISSIONED")}>
                Decommission
              </Button>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Schedule Maintenance</p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={maintForm.type} onValueChange={(v) => setMaintForm({ ...maintForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MAINT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={maintForm.scheduledDate} onChange={(e) => setMaintForm({ ...maintForm, scheduledDate: e.target.value })} type="date" placeholder="Date" />
              <Input value={maintForm.performedBy} onChange={(e) => setMaintForm({ ...maintForm, performedBy: e.target.value })} placeholder="Technician" className="col-span-2" />
              <Input value={maintForm.notes} onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })} placeholder="Notes" className="col-span-2" />
            </div>
            <Button
              size="sm"
              className="mt-2 w-full"
              disabled={!maintForm.scheduledDate || scheduleMaint.isPending}
              onClick={() => scheduleMaint.mutate(maintForm)}
            >
              Schedule
            </Button>
          </div>

          {asset.maintenances?.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Maintenance History</p>
              <div className="space-y-2">
                {asset.maintenances.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <div>
                      <span className="font-medium">{m.type}</span>
                      <span className="text-muted-foreground ml-2">{format(new Date(m.scheduledDate), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {maintStatusBadge(m.status)}
                      {m.status === "SCHEDULED" && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => completeMaint.mutate(m.id)}>Done</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AssetsPage() {
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: summary } = useQuery({
    queryKey: ["assets-summary"],
    queryFn: () => api.get("/assets/summary").then((r) => r.data),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets", categoryFilter, statusFilter],
    queryFn: () => api.get("/assets", {
      params: {
        ...(categoryFilter !== "ALL" ? { category: categoryFilter } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      },
    }).then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["assets"] });
    qc.invalidateQueries({ queryKey: ["assets-summary"] });
  };

  const fmt = (n: number) => `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Management</h1>
          <p className="text-muted-foreground">Equipment registry, tracking and maintenance</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.active ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{summary?.underMaintenance ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Maintenance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.scheduledMaint ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Asset Value</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{fmt(summary?.totalValue ?? 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AddAssetDialog onSuccess={invalidate} />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand / Model</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No assets found</TableCell></TableRow>
              )}
              {assets.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.assetNumber}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-sm">{a.category.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{[a.brand, a.model].filter(Boolean).join(" / ") || "—"}</TableCell>
                  <TableCell className="text-sm">{a.location ?? "—"}</TableCell>
                  <TableCell>{statusBadge(a.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.warrantyExpiry ? format(new Date(a.warrantyExpiry), "MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell><AssetDetailSheet asset={a} onSuccess={invalidate} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
