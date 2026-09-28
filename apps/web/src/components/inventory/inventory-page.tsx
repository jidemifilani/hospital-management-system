"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Boxes, Loader2, Plus, PackagePlus, ArrowRightLeft, ClipboardCheck, AlertTriangle, Scale,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const naira = (v: string | number) =>
  `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CATEGORIES = [
  "DRUG", "CONSUMABLE", "REAGENT", "SURGICAL", "LINEN", "STATIONERY", "CLEANING", "SPARE_PART", "OTHER",
];

interface Item {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  reorderLevel: number;
  averageCost: string;
  requiresBatch: boolean;
  levels: { quantity: number; location: { code: string; name: string } }[];
}

interface Location {
  id: string;
  code: string;
  name: string;
  type: string;
}

function useLookups() {
  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["inv-items"],
    queryFn: async () => (await api.get("/inventory/items")).data,
  });
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["inv-locations"],
    queryFn: async () => (await api.get("/inventory/locations")).data,
  });
  return { items, locations };
}

function ReceiveDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { items, locations } = useLookups();
  const [form, setForm] = useState({
    itemId: "", locationId: "", quantity: "", unitCost: "",
    supplierName: "", batchNumber: "", expiresAt: "",
  });

  const item = items.find((i) => i.id === form.itemId);

  const receive = useMutation({
    mutationFn: () =>
      api.post("/inventory/receive", {
        itemId: form.itemId,
        locationId: form.locationId,
        quantity: Number(form.quantity),
        unitCost: Number(form.unitCost),
        supplierName: form.supplierName || undefined,
        batchNumber: form.batchNumber || undefined,
        expiresAt: form.expiresAt || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv-items"] });
      qc.invalidateQueries({ queryKey: ["inv-stock"] });
      qc.invalidateQueries({ queryKey: ["inv-reconcile"] });
      toast({ title: "Stock received", description: "Cost posted to the ledger." });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const needsBatch = item?.requiresBatch;
  const valid =
    form.itemId && form.locationId && Number(form.quantity) > 0 && Number(form.unitCost) >= 0 &&
    (!needsBatch || (form.batchNumber && form.expiresAt));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Receive Stock</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Item *</Label>
            <Select value={form.itemId} onValueChange={(v) => setForm({ ...form, itemId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Into *</Label>
            <Select value={form.locationId} onValueChange={(v) => setForm({ ...form, locationId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rcv-qty" className="text-xs">Quantity *</Label>
              <Input id="rcv-qty" type="number" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rcv-cost" className="text-xs">Unit cost (₦) *</Label>
              <Input id="rcv-cost" type="number" value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rcv-supplier" className="text-xs">Supplier</Label>
            <Input id="rcv-supplier" value={form.supplierName}
              onChange={(e) => setForm({ ...form, supplierName: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              Named suppliers can be aged and chased; unnamed ones cannot.
            </p>
          </div>

          {needsBatch && (
            <div className="grid grid-cols-2 gap-3 rounded border bg-amber-50 p-3 dark:bg-amber-950/30">
              <div className="col-span-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                {item?.name} is batch-tracked — it cannot be dispensed without these.
              </div>
              <div className="space-y-1">
                <Label htmlFor="rcv-batch" className="text-xs">Batch number *</Label>
                <Input id="rcv-batch" value={form.batchNumber}
                  onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rcv-expiry" className="text-xs">Expires *</Label>
                <Input id="rcv-expiry" type="date" value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || receive.isPending} onClick={() => receive.mutate()}>
            {receive.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Receive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { items, locations } = useLookups();
  const [form, setForm] = useState({ itemId: "", locationId: "", countedQuantity: "", reason: "" });

  const book = items
    .find((i) => i.id === form.itemId)
    ?.levels.find((l) => locations.find((loc) => loc.id === form.locationId)?.code === l.location.code)
    ?.quantity;

  const count = useMutation({
    mutationFn: () =>
      api.post("/inventory/count", {
        itemId: form.itemId,
        locationId: form.locationId,
        countedQuantity: Number(form.countedQuantity),
        reason: form.reason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv-items"] });
      qc.invalidateQueries({ queryKey: ["inv-stock"] });
      qc.invalidateQueries({ queryKey: ["inv-reconcile"] });
      toast({ title: "Count recorded", description: "The difference was posted to the ledger." });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const difference =
    book !== undefined && form.countedQuantity !== "" ? Number(form.countedQuantity) - book : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record a Stock Count</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Item *</Label>
            <Select value={form.itemId} onValueChange={(v) => setForm({ ...form, itemId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Location *</Label>
            <Select value={form.locationId} onValueChange={(v) => setForm({ ...form, locationId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cnt-qty" className="text-xs">Counted on the shelf *</Label>
            <Input id="cnt-qty" type="number" value={form.countedQuantity}
              onChange={(e) => setForm({ ...form, countedQuantity: e.target.value })} />
            {book !== undefined && (
              <p className="text-xs text-muted-foreground">Book figure: {book}</p>
            )}
            {difference !== null && difference !== 0 && (
              <p className={`text-sm ${difference < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {difference < 0 ? "Short" : "Surplus"} of {Math.abs(difference)} — this is written
                to the ledger.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cnt-reason" className="text-xs">Reason *</Label>
            <Input id="cnt-reason" placeholder="e.g. Quarterly count" value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.itemId || !form.locationId || form.countedQuantity === "" || !form.reason || count.isPending}
            onClick={() => count.mutate()}
          >
            {count.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Count
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewItemDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    code: "", name: "", category: "CONSUMABLE", unit: "", reorderLevel: "0", sellingPrice: "",
  });

  const create = useMutation({
    mutationFn: () =>
      api.post("/inventory/items", {
        code: form.code,
        name: form.name,
        category: form.category,
        unit: form.unit,
        reorderLevel: Number(form.reorderLevel || 0),
        ...(form.sellingPrice ? { sellingPrice: Number(form.sellingPrice) } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv-items"] });
      toast({ title: "Item added" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="itm-code" className="text-xs">Code *</Label>
              <Input id="itm-code" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="itm-unit" className="text-xs">Unit *</Label>
              <Input id="itm-unit" placeholder="box, pack, roll" value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="itm-name" className="text-xs">Name *</Label>
            <Input id="itm-name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="itm-reorder" className="text-xs">Reorder level</Label>
              <Input id="itm-reorder" type="number" value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="itm-price" className="text-xs">Selling price (₦)</Label>
              <Input id="itm-price" type="number" value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
              <p className="text-xs text-muted-foreground">Needed to sell at the till.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.code || !form.name || !form.unit || create.isPending}
            onClick={() => create.mutate()}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryPage() {
  const [dialog, setDialog] = useState<"receive" | "count" | "item" | null>(null);

  const { data: stock } = useQuery({
    queryKey: ["inv-stock"],
    queryFn: async () => (await api.get("/inventory/stock")).data,
  });
  const { data: lowStock = [] } = useQuery({
    queryKey: ["inv-low"],
    queryFn: async () => (await api.get("/inventory/low-stock")).data,
  });
  const { data: reconcile } = useQuery({
    queryKey: ["inv-reconcile"],
    queryFn: async () => (await api.get("/inventory/reconcile")).data,
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["inv-movements"],
    queryFn: async () => (await api.get("/inventory/movements", { params: { limit: 50 } })).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Boxes className="h-6 w-6" /> Inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            Consumables, reagents and drugs across every store and ward.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialog("item")}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
          <Button variant="outline" onClick={() => setDialog("count")}>
            <ClipboardCheck className="mr-2 h-4 w-4" /> Stock Count
          </Button>
          <Button onClick={() => setDialog("receive")}>
            <PackagePlus className="mr-2 h-4 w-4" /> Receive Stock
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="px-4 pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Stock Value</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{naira(stock?.totalValue ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-4 pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">At or Below Reorder</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-2xl font-bold ${lowStock.length ? "text-amber-600" : ""}`}>
              {lowStock.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-4 pb-1 pt-4">
            <CardTitle className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Scale className="h-3 w-3" /> Ledger Agreement
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {reconcile?.reconciled ? (
              <p className="text-2xl font-bold text-emerald-600">Agrees</p>
            ) : (
              <>
                <p className="text-2xl font-bold text-red-600">
                  {naira(reconcile?.variance ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">stock vs ledger</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock on Hand</TabsTrigger>
          <TabsTrigger value="low">Low Stock</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stock?.rows ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        Nothing in stock yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {(stock?.rows ?? []).map((r: any, i: number) => (
                    <TableRow key={`${r.code}-${r.location}-${i}`}>
                      <TableCell>
                        <div className="text-sm font-medium">{r.item}</div>
                        <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.location}</TableCell>
                      <TableCell className="text-right text-sm">{r.quantity} {r.unit}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {naira(r.unitCost)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{naira(r.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {lowStock.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Everything is above its reorder level.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">On hand</TableHead>
                      <TableHead className="text-right">Reorder at</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStock.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            {l.name}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">{l.code}</div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-amber-700">
                          {l.onHand} {l.unit}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {l.reorderLevel}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Movement</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{m.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{m.item.name}</TableCell>
                      <TableCell className="text-right text-sm">{m.quantity} {m.item.unit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.fromLocation?.name ?? "supplier"} → {m.toLocation?.name ?? "consumed"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.occurredAt).toLocaleString("en-NG", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dialog === "receive" && <ReceiveDialog onClose={() => setDialog(null)} />}
      {dialog === "count" && <CountDialog onClose={() => setDialog(null)} />}
      {dialog === "item" && <NewItemDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
