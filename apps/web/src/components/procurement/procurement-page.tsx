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
import { Plus, ShoppingCart, Package, CheckCircle, Clock, Truck, FileText, GitMerge, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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

const fmtN = (n: any) => `₦${Number(n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

function matchBadge(status: string) {
  if (status === "OK")             return <span className="text-green-600 flex items-center gap-1 text-xs"><CheckCircle2 className="h-3 w-3" />OK</span>;
  if (status === "QTY_VARIANCE")   return <span className="text-orange-600 flex items-center gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Qty Var</span>;
  if (status === "PRICE_VARIANCE") return <span className="text-orange-600 flex items-center gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Price Var</span>;
  if (status === "BOTH_VARIANCE")  return <span className="text-red-600 flex items-center gap-1 text-xs"><XCircle className="h-3 w-3" />Both Var</span>;
  if (status === "NOT_INVOICED")   return <span className="text-gray-400 text-xs">Not invoiced</span>;
  return <span className="text-xs text-muted-foreground">{status}</span>;
}

function GrnTab({ po }: { po: any }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ receivedAt: string; notes: string; lines: { poItemId: string; quantity: string; unitCost: string }[] }>({
    receivedAt: new Date().toISOString().slice(0, 10),
    notes: "",
    lines: (po.items ?? []).map((i: any) => ({ poItemId: i.id, quantity: String(i.quantity - i.receivedQuantity), unitCost: String(i.unitPrice) })),
  });

  const { data: grns = [], refetch } = useQuery({
    queryKey: ["grns", po.id],
    queryFn: () => api.get(`/procurement/${po.id}/grns`).then((r) => r.data),
  });

  const createGrn = useMutation({
    mutationFn: (data: any) => api.post(`/procurement/${po.id}/grns`, data).then((r) => r.data),
    onSuccess: () => { setShowForm(false); refetch(); qc.invalidateQueries({ queryKey: ["purchase-orders"] }); },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Goods Receipt Notes</p>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" />New GRN
        </Button>
      </div>

      {showForm && (
        <div className="rounded-md border p-3 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Received Date</Label>
              <Input type="date" value={form.receivedAt} onChange={(e) => setForm({ ...form, receivedAt: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead><tr className="border-b text-muted-foreground"><th className="text-left py-1">Item</th><th className="text-right py-1 w-20">Qty</th><th className="text-right py-1 w-28">Unit Cost</th></tr></thead>
            <tbody>
              {form.lines.map((line, i) => {
                const item = (po.items ?? []).find((x: any) => x.id === line.poItemId);
                return (
                  <tr key={i} className="border-b">
                    <td className="py-1">{item?.itemName}</td>
                    <td className="py-1 text-right"><Input className="h-7 text-xs w-20 ml-auto" type="number" value={line.quantity} onChange={(e) => { const n = [...form.lines]; n[i]!.quantity = e.target.value; setForm({ ...form, lines: n }); }} /></td>
                    <td className="py-1 text-right"><Input className="h-7 text-xs w-28 ml-auto" type="number" value={line.unitCost} onChange={(e) => { const n = [...form.lines]; n[i]!.unitCost = e.target.value; setForm({ ...form, lines: n }); }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Button size="sm" className="w-full" disabled={createGrn.isPending}
            onClick={() => createGrn.mutate({ ...form, lines: form.lines.filter((l) => Number(l.quantity) > 0).map((l) => ({ ...l, quantity: Number(l.quantity), unitCost: Number(l.unitCost) })) })}>
            {createGrn.isPending ? "Saving..." : "Create GRN"}
          </Button>
        </div>
      )}

      {(grns as any[]).length === 0 && !showForm && <p className="text-xs text-muted-foreground">No GRNs yet.</p>}
      {(grns as any[]).map((grn) => (
        <div key={grn.id} className="rounded-md border p-2 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono font-medium">{grn.grnNumber}</span>
            <span className="text-muted-foreground">{format(new Date(grn.receivedAt), "dd MMM yyyy")}</span>
          </div>
          {grn.receivedBy && <p className="text-muted-foreground">Received by {grn.receivedBy.firstName} {grn.receivedBy.lastName}</p>}
          {grn.lines.map((l: any) => (
            <div key={l.id} className="flex justify-between border-t pt-1">
              <span>{l.poItem?.itemName}</span>
              <span>{l.quantity} × {fmtN(l.unitCost)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SupplierInvoiceTab({ po }: { po: any }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ vendorInvoiceNo: string; invoiceDate: string; dueDate: string; notes: string; lines: { poItemId: string; description: string; quantity: string; unitPrice: string }[] }>({
    vendorInvoiceNo: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    notes: "",
    lines: (po.items ?? []).map((i: any) => ({ poItemId: i.id, description: i.itemName, quantity: String(i.quantity), unitPrice: String(i.unitPrice) })),
  });
  const [matchResult, setMatchResult] = useState<any>(null);

  const { data: invoices = [], refetch } = useQuery({
    queryKey: ["supplier-invoices", po.id],
    queryFn: () => api.get(`/procurement/${po.id}/supplier-invoices`).then((r) => r.data),
  });

  const createSI = useMutation({
    mutationFn: (data: any) => api.post(`/procurement/${po.id}/supplier-invoices`, data).then((r) => r.data),
    onSuccess: () => { setShowForm(false); refetch(); },
  });

  const runMatch = useMutation({
    mutationFn: (siId: string) => api.post(`/procurement/supplier-invoices/${siId}/run-match`).then((r) => r.data),
    onSuccess: (data) => { setMatchResult(data); refetch(); },
  });

  const approveInvoice = useMutation({
    mutationFn: (siId: string) => api.post(`/procurement/supplier-invoices/${siId}/approve`).then((r) => r.data),
    onSuccess: () => refetch(),
  });

  const siBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-gray-100 text-gray-800", MATCHED: "bg-green-100 text-green-800",
      DISCREPANCY: "bg-red-100 text-red-800", APPROVED: "bg-blue-100 text-blue-800",
      PAID: "bg-emerald-100 text-emerald-800", DISPUTED: "bg-orange-100 text-orange-800",
    };
    return <Badge className={`text-xs ${map[status] ?? "bg-gray-100 text-gray-800"}`}>{status}</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Supplier Invoices</p>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" />New Invoice
        </Button>
      </div>

      {showForm && (
        <div className="rounded-md border p-3 space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1"><Label className="text-xs">Vendor Invoice #</Label><Input value={form.vendorInvoiceNo} onChange={(e) => setForm({ ...form, vendorInvoiceNo: e.target.value })} placeholder="Optional" /></div>
            <div className="space-y-1"><Label className="text-xs">Invoice Date</Label><Input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead><tr className="border-b text-muted-foreground"><th className="text-left py-1">Description</th><th className="text-right py-1 w-20">Qty</th><th className="text-right py-1 w-28">Unit Price</th><th className="text-right py-1 w-24">Total</th></tr></thead>
            <tbody>
              {form.lines.map((line, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1"><Input className="h-7 text-xs" value={line.description} onChange={(e) => { const n = [...form.lines]; n[i]!.description = e.target.value; setForm({ ...form, lines: n }); }} /></td>
                  <td className="py-1 text-right"><Input className="h-7 text-xs w-20 ml-auto" type="number" value={line.quantity} onChange={(e) => { const n = [...form.lines]; n[i]!.quantity = e.target.value; setForm({ ...form, lines: n }); }} /></td>
                  <td className="py-1 text-right"><Input className="h-7 text-xs w-28 ml-auto" type="number" value={line.unitPrice} onChange={(e) => { const n = [...form.lines]; n[i]!.unitPrice = e.target.value; setForm({ ...form, lines: n }); }} /></td>
                  <td className="py-1 text-right text-muted-foreground">{fmtN(Number(line.quantity) * Number(line.unitPrice))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button size="sm" className="w-full" disabled={createSI.isPending}
            onClick={() => createSI.mutate({ ...form, lines: form.lines.filter((l) => l.description).map((l) => ({ ...l, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })) })}>
            {createSI.isPending ? "Saving..." : "Create Supplier Invoice"}
          </Button>
        </div>
      )}

      {(invoices as any[]).length === 0 && !showForm && <p className="text-xs text-muted-foreground">No supplier invoices yet.</p>}
      {(invoices as any[]).map((si) => (
        <div key={si.id} className="rounded-md border p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">{si.siNumber}</span>
              {si.vendorInvoiceNo && <span className="text-muted-foreground">({si.vendorInvoiceNo})</span>}
              {siBadge(si.status)}
              <Badge className={`text-xs ${si.matchStatus === "MATCHED" ? "bg-green-100 text-green-800" : si.matchStatus === "DISCREPANCY" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                {si.matchStatus}
              </Badge>
            </div>
            <span className="font-semibold">{fmtN(si.totalAmount)}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => runMatch.mutate(si.id)} disabled={runMatch.isPending}>
              <GitMerge className="h-3 w-3 mr-1" />{runMatch.isPending ? "Matching..." : "Run 3-Way Match"}
            </Button>
            {si.matchStatus === "MATCHED" && si.status !== "APPROVED" && si.status !== "PAID" && (
              <Button size="sm" className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={() => approveInvoice.mutate(si.id)} disabled={approveInvoice.isPending}>
                <CheckCircle2 className="h-3 w-3 mr-1" />Approve
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Match result panel */}
      {matchResult && (
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Match Result</p>
            <Badge className={matchResult.matchStatus === "MATCHED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {matchResult.matchStatus}
            </Badge>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-1">Item</th>
                <th className="text-right py-1">PO Qty</th>
                <th className="text-right py-1">GRN Qty</th>
                <th className="text-right py-1">Inv Qty</th>
                <th className="text-right py-1">PO Price</th>
                <th className="text-right py-1">Inv Price</th>
                <th className="text-right py-1">Price Var</th>
                <th className="py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {matchResult.rows.map((row: any) => (
                <tr key={row.poItemId} className="border-b">
                  <td className="py-1">{row.itemName}</td>
                  <td className="text-right py-1">{row.poQty}</td>
                  <td className={`text-right py-1 ${row.grnQty < row.poQty ? "text-orange-600" : ""}`}>{row.grnQty}</td>
                  <td className={`text-right py-1 ${row.qtyVariance !== 0 ? "text-red-600 font-medium" : ""}`}>{row.invoicedQty}</td>
                  <td className="text-right py-1">{fmtN(row.poUnitPrice)}</td>
                  <td className={`text-right py-1 ${row.priceVariance !== 0 ? "text-red-600 font-medium" : ""}`}>{fmtN(row.invoicedUnitPrice)}</td>
                  <td className={`text-right py-1 ${row.priceVariance !== 0 ? "text-red-600" : "text-green-600"}`}>{fmtN(row.priceVariance)}</td>
                  <td className="py-1 pl-2">{matchBadge(row.matchStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PODetailSheet({ po, onSuccess }: { po: any; onSuccess: () => void }) {
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/procurement/${po.id}/status`, { status }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); onSuccess(); },
  });

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
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{po.poNumber} — {po.vendorName}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {statusBadge(po.status)}
            <span className="text-sm text-muted-foreground">Total: {fmtN(po.totalAmount)}</span>
            {po.vendorContact && <span className="text-sm text-muted-foreground">· {po.vendorContact}</span>}
            {po.expectedAt && <span className="text-sm text-muted-foreground">· Expected: {format(new Date(po.expectedAt), "dd MMM yyyy")}</span>}
          </div>

          <Tabs defaultValue="lines">
            <TabsList className="h-8">
              <TabsTrigger value="lines" className="text-xs h-7"><Package className="h-3 w-3 mr-1" />Order Lines</TabsTrigger>
              <TabsTrigger value="grns" className="text-xs h-7"><Truck className="h-3 w-3 mr-1" />GRNs</TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs h-7"><FileText className="h-3 w-3 mr-1" />Supplier Invoices</TabsTrigger>
            </TabsList>

            <TabsContent value="lines" className="mt-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-1">Item</th>
                    <th className="text-right py-1">Qty</th>
                    <th className="text-right py-1">Price</th>
                    <th className="text-right py-1">Total</th>
                    <th className="text-right py-1">Rcvd</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.items ?? []).map((item: any) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-1">{item.itemName}{item.unit ? ` (${item.unit})` : ""}</td>
                      <td className="text-right py-1">{item.quantity}</td>
                      <td className="text-right py-1">{fmtN(item.unitPrice)}</td>
                      <td className="text-right py-1">{fmtN(item.totalPrice)}</td>
                      <td className={`text-right py-1 ${item.receivedQuantity >= item.quantity ? "text-green-600" : item.receivedQuantity > 0 ? "text-orange-600" : ""}`}>
                        {item.receivedQuantity}/{item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex gap-2 flex-wrap">
                {nextStatus[po.status] && (
                  <Button className="flex-1" onClick={() => updateStatus.mutate(nextStatus[po.status]!)} disabled={updateStatus.isPending}>
                    Mark as {nextStatus[po.status]!.replace(/_/g, " ")}
                  </Button>
                )}
                {po.status !== "CANCELLED" && po.status !== "RECEIVED" && (
                  <Button variant="outline" className="text-red-600" onClick={() => updateStatus.mutate("CANCELLED")} disabled={updateStatus.isPending}>
                    Cancel
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="grns" className="mt-3">
              <GrnTab po={po} />
            </TabsContent>

            <TabsContent value="invoices" className="mt-3">
              <SupplierInvoiceTab po={po} />
            </TabsContent>
          </Tabs>
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
