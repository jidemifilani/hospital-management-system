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
import { Plus, ShoppingCart, Package, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const STATUS_OPTIONS = ["DRAFT", "SUBMITTED", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    APPROVED: "bg-green-100 text-green-800",
    ORDERED: "bg-yellow-100 text-yellow-800",
    PARTIALLY_RECEIVED: "bg-orange-100 text-orange-800",
    RECEIVED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status.replace(/_/g, " ")}</Badge>;
}

const emptyItem = () => ({ itemName: "", category: "", unit: "", quantity: "1", unitPrice: "" });

function CreatePODialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vendorName: "", vendorContact: "", vendorEmail: "", notes: "", expectedAt: "" });
  const [items, setItems] = useState([emptyItem()]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/procurement", data).then((r) => r.data),
    onSuccess: () => {
      setOpen(false);
      setForm({ vendorName: "", vendorContact: "", vendorEmail: "", notes: "", expectedAt: "" });
      setItems([emptyItem()]);
      onSuccess();
    },
  });

  const updateItem = (i: number, k: string, v: string) => {
    const next = [...items];
    (next[i] as any)[k] = v;
    setItems(next);
  };

  const total = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Purchase Order</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Vendor Name</Label>
              <Input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Contact</Label>
              <Input value={form.vendorContact} onChange={(e) => setForm({ ...form, vendorContact: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Expected By</Label>
              <Input value={form.expectedAt} onChange={(e) => setForm({ ...form, expectedAt: e.target.value })} type="date" />
            </div>
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Line Items</p>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setItems([...items, emptyItem()])}>+ Add Item</Button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4 space-y-1">
                    {i === 0 && <Label className="text-xs">Item Name</Label>}
                    <Input value={item.itemName} onChange={(e) => updateItem(i, "itemName", e.target.value)} placeholder="Item name" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    {i === 0 && <Label className="text-xs">Category</Label>}
                    <Input value={item.category} onChange={(e) => updateItem(i, "category", e.target.value)} placeholder="e.g. Drug" />
                  </div>
                  <div className="col-span-1 space-y-1">
                    {i === 0 && <Label className="text-xs">Unit</Label>}
                    <Input value={item.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} placeholder="pcs" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    {i === 0 && <Label className="text-xs">Qty</Label>}
                    <Input value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} type="number" min="1" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    {i === 0 && <Label className="text-xs">Unit Price</Label>}
                    <Input value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} type="number" placeholder="0.00" />
                  </div>
                  <div className="col-span-1">
                    {items.length > 1 && (
                      <Button size="sm" variant="ghost" className="h-10 px-2 text-red-500 w-full" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>✕</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-right text-sm font-semibold mt-3">Total: {fmt(total)}</p>
          </div>
          <Button
            className="w-full"
            disabled={!form.vendorName || items.every((i) => !i.itemName) || mutation.isPending}
            onClick={() => mutation.mutate({
              ...form,
              items: items
                .filter((i) => i.itemName)
                .map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
            })}
          >
            {mutation.isPending ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PODetailSheet({ po, onSuccess }: { po: any; onSuccess: () => void }) {
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/procurement/${po.id}/status`, { status }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); onSuccess(); },
  });

  const fmt = (n: number) => `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  const nextStatus: Record<string, string> = {
    DRAFT: "SUBMITTED",
    SUBMITTED: "APPROVED",
    APPROVED: "ORDERED",
    ORDERED: "RECEIVED",
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2">View</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{po.poNumber} — {po.vendorName}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            {statusBadge(po.status)}
            <span className="text-sm text-muted-foreground">Total: {fmt(po.totalAmount)}</span>
          </div>
          {po.vendorContact && <p className="text-sm">Contact: {po.vendorContact}</p>}
          {po.expectedAt && <p className="text-sm text-muted-foreground">Expected: {format(new Date(po.expectedAt), "dd MMM yyyy")}</p>}
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Line Items</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-1">Item</th>
                  <th className="text-right py-1">Qty</th>
                  <th className="text-right py-1">Price</th>
                  <th className="text-right py-1">Total</th>
                  <th className="text-right py-1">Received</th>
                </tr>
              </thead>
              <tbody>
                {(po.items ?? []).map((item: any) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-1">{item.itemName}{item.unit ? ` (${item.unit})` : ""}</td>
                    <td className="text-right py-1">{item.quantity}</td>
                    <td className="text-right py-1">{fmt(item.unitPrice)}</td>
                    <td className="text-right py-1">{fmt(item.totalPrice)}</td>
                    <td className="text-right py-1">{item.receivedQuantity}/{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {nextStatus[po.status] ? (
            <Button className="w-full" onClick={() => updateStatus.mutate(nextStatus[po.status]!)} disabled={updateStatus.isPending}>
              Mark as {nextStatus[po.status]!.replace(/_/g, " ")}
            </Button>
          ) : null}
          {po.status !== "CANCELLED" && po.status !== "RECEIVED" && (
            <Button variant="outline" className="w-full text-red-600" onClick={() => updateStatus.mutate("CANCELLED")} disabled={updateStatus.isPending}>
              Cancel Order
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ProcurementPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: summary } = useQuery({
    queryKey: ["procurement-summary"],
    queryFn: () => api.get("/procurement/summary").then((r) => r.data),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["purchase-orders", statusFilter],
    queryFn: () => api.get("/procurement", { params: statusFilter !== "ALL" ? { status: statusFilter } : {} }).then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    qc.invalidateQueries({ queryKey: ["procurement-summary"] });
  };

  const fmt = (n: number) => `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Procurement</h1>
          <p className="text-muted-foreground">Purchase orders and vendor management</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary?.submitted ?? 0) + (summary?.approved ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ordered</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.ordered ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.received ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{fmt(summary?.totalValue ?? 0)}</div>
            <p className="text-xs text-muted-foreground">all active orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <CreatePODialog onSuccess={invalidate} />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No purchase orders</TableCell></TableRow>
              )}
              {orders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.poNumber}</TableCell>
                  <TableCell className="font-medium">{o.vendorName}</TableCell>
                  <TableCell>{o.items?.length ?? 0} items</TableCell>
                  <TableCell>{fmt(o.totalAmount)}</TableCell>
                  <TableCell>{statusBadge(o.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.expectedAt ? format(new Date(o.expectedAt), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(o.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell><PODetailSheet po={o} onSuccess={invalidate} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
