"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, PackagePlus, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface DrugItem {
  id: string; name: string; genericName?: string; code: string; category: string;
  unit: string; reorderLevel: number; sellingPrice: string; isActive: boolean;
  batches: { quantity: number; expiresAt: string; batchNumber: string }[];
  _count: { prescItems: number };
}

const NGN = (n: string | number) =>
  Number(n).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

// ── Add Drug Dialog ────────────────────────────────────────────────────────────
function AddDrugDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "", genericName: "", code: "", category: "", unit: "",
    reorderLevel: "50", sellingPrice: "",
  });
  const { toast } = useToast();
  const create = useMutation({
    mutationFn: () => api.post("/pharmacy/drugs", {
      ...form,
      reorderLevel: Number(form.reorderLevel),
      sellingPrice: Number(form.sellingPrice),
    }),
    onSuccess: () => { toast({ title: "Drug added to catalogue" }); onSuccess(); onClose(); },
    onError: (e: any) => toast({ title: apiErrorMessage(e, "Failed"), variant: "destructive" }),
  });

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Drug to Catalogue</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Brand Name *</Label>
              <Input value={form.name} onChange={(e) => f("name", e.target.value)} className="mt-1" placeholder="e.g. Paracetamol 500mg" />
            </div>
            <div>
              <Label className="text-xs">Generic Name</Label>
              <Input value={form.genericName} onChange={(e) => f("genericName", e.target.value)} className="mt-1" placeholder="e.g. Acetaminophen" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Code *</Label>
              <Input value={form.code} onChange={(e) => f("code", e.target.value)} className="mt-1" placeholder="e.g. PARA500" />
            </div>
            <div>
              <Label className="text-xs">Category *</Label>
              <Input value={form.category} onChange={(e) => f("category", e.target.value)} className="mt-1" placeholder="e.g. Analgesic" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Unit *</Label>
              <Input value={form.unit} onChange={(e) => f("unit", e.target.value)} className="mt-1" placeholder="Tabs/Vials…" />
            </div>
            <div>
              <Label className="text-xs">Reorder Level</Label>
              <Input type="number" value={form.reorderLevel} onChange={(e) => f("reorderLevel", e.target.value)} className="mt-1" min={0} />
            </div>
            <div>
              <Label className="text-xs">Selling Price (₦) *</Label>
              <Input type="number" value={form.sellingPrice} onChange={(e) => f("sellingPrice", e.target.value)} className="mt-1" min={0} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || !form.name || !form.code || !form.category || !form.unit || !form.sellingPrice}
          >
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Drug
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Restock Dialog ─────────────────────────────────────────────────────────────
function RestockDialog({ drug, onClose, onSuccess }: { drug: DrugItem; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    batchNumber: "", quantity: "", expiresAt: "", supplierName: "", costPerUnit: "",
  });
  const { toast } = useToast();
  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = useMutation({
    mutationFn: () => api.post(`/pharmacy/drugs/${drug.id}/restock`, {
      batchNumber: form.batchNumber,
      quantity: Number(form.quantity),
      expiresAt: form.expiresAt,
      supplierName: form.supplierName || undefined,
      costPerUnit: Number(form.costPerUnit),
    }),
    onSuccess: () => { toast({ title: `Stock received for ${drug.name}` }); onSuccess(); onClose(); },
    onError: (e: any) => toast({ title: apiErrorMessage(e, "Failed"), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receive Stock — {drug.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">Current stock: {(drug.batches ?? []).reduce((s, b) => s + b.quantity, 0)} {drug.unit}</p>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Batch Number *</Label>
              <Input value={form.batchNumber} onChange={(e) => f("batchNumber", e.target.value)} className="mt-1" placeholder="BATCH-001" />
            </div>
            <div>
              <Label className="text-xs">Quantity *</Label>
              <Input type="number" value={form.quantity} onChange={(e) => f("quantity", e.target.value)} className="mt-1" min={1} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Expiry Date *</Label>
              <Input type="date" value={form.expiresAt} onChange={(e) => f("expiresAt", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Cost Per Unit (₦) *</Label>
              <Input type="number" value={form.costPerUnit} onChange={(e) => f("costPerUnit", e.target.value)} className="mt-1" min={0} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Supplier Name</Label>
            <Input value={form.supplierName} onChange={(e) => f("supplierName", e.target.value)} className="mt-1" placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !form.batchNumber || !form.quantity || !form.expiresAt || !form.costPerUnit}
          >
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <PackagePlus className="mr-2 h-4 w-4" />Receive Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Drug Catalogue Tab ─────────────────────────────────────────────────────────
export function DrugCatalogue() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [restockTarget, setRestockTarget] = useState<DrugItem | null>(null);
  const qc = useQueryClient();

  const { data: drugs = [], isLoading } = useQuery<DrugItem[]>({
    queryKey: ["drug-catalogue", search],
    queryFn: () => api.get("/pharmacy/drugs/catalogue", { params: search ? { search } : {} }).then((r: any) => r.data),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["drug-catalogue"] });
    qc.invalidateQueries({ queryKey: ["low-stock"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search drugs…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />Add Drug
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drug</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">Reorder Level</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-muted" /></TableCell>
                  ))}</TableRow>
                ))
              : drugs.length === 0
              ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No drugs in catalogue. Add the first one.</TableCell></TableRow>
              : drugs.map((d) => {
                  const totalStock = (d.batches ?? []).reduce((s, b) => s + b.quantity, 0);
                  const isLow = totalStock <= d.reorderLevel;
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{d.name}</p>
                        {d.genericName && <p className="text-xs text-muted-foreground">{d.genericName}</p>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{d.code}</TableCell>
                      <TableCell className="text-sm">{d.category}</TableCell>
                      <TableCell className="text-sm">{d.unit}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${isLow ? "text-red-600" : "text-green-600"}`}>{totalStock}</span>
                        {isLow && <AlertTriangle className="ml-1 inline h-3 w-3 text-red-500" />}
                      </TableCell>
                      <TableCell className="text-right text-sm">{d.reorderLevel}</TableCell>
                      <TableCell className="text-right text-sm">{NGN(d.sellingPrice)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setRestockTarget(d)}>
                          <PackagePlus className="mr-1 h-3 w-3" />Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {showAdd && (
        <AddDrugDialog open onClose={() => setShowAdd(false)} onSuccess={refresh} />
      )}
      {restockTarget && (
        <RestockDialog drug={restockTarget} onClose={() => setRestockTarget(null)} onSuccess={refresh} />
      )}
    </div>
  );
}
