"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Loader2, Plus, Trash2, Send, Lock, Award, Ban, ArrowLeft,
  UserPlus, CheckCircle2, XCircle, AlertTriangle, Clock,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const naira = (v: string | number | null) =>
  v === null ? "—" : `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-slate-100 text-slate-700",
  SENT:      "bg-blue-100 text-blue-700",
  CLOSED:    "bg-amber-100 text-amber-700",
  AWARDED:   "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  PENDING:  "bg-slate-100 text-slate-600",
  RECEIVED: "bg-blue-100 text-blue-700",
  DECLINED: "bg-red-100 text-red-700",
  AWARDED:  "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-slate-100 text-slate-500",
};

interface RfqListRow {
  id: string; rfqNumber: string; title: string; status: string;
  dueDate?: string; createdAt: string;
  _count: { items: number; quotes: number };
  purchaseOrder?: { id: string; poNumber: string } | null;
}
interface RfqItem { id: string; itemName: string; category?: string; unit?: string; quantity: number; specification?: string }
interface RfqQuote {
  id: string; vendorName: string; vendorContact?: string; vendorEmail?: string;
  status: string; totalAmount: string; leadTimeDays?: number; validUntil?: string;
  notes?: string; respondedAt?: string;
  lines: { id: string; rfqItemId: string; unitPrice: string; quantity: number; totalPrice: string }[];
}
interface RfqDetail {
  id: string; rfqNumber: string; title: string; description?: string; status: string;
  dueDate?: string; notes?: string; awardedQuoteId?: string;
  items: RfqItem[]; quotes: RfqQuote[];
  purchaseOrder?: { id: string; poNumber: string; status: string } | null;
}
interface Comparison {
  rfqNumber: string; title: string; status: string; awardedQuoteId?: string;
  vendors: {
    quoteId: string; vendorName: string; status: string; totalAmount: string;
    leadTimeDays?: number; itemsQuoted: number; complete: boolean; lowestTotal: boolean;
  }[];
  rows: {
    rfqItemId: string; itemName: string; unit?: string; quantity: number;
    cells: { quoteId: string; unitPrice: string | null; quantity: number | null; totalPrice: string | null; isLowest: boolean }[];
  }[];
  awaiting: { quoteId: string; vendorName: string }[];
  declined: { quoteId: string; vendorName: string }[];
}

// ── Create RFQ dialog ────────────────────────────────────────────────────────

function CreateRfqDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [header, setHeader] = useState({ title: "", description: "", dueDate: "" });
  const [items, setItems] = useState([{ itemName: "", unit: "", quantity: "1", specification: "" }]);

  const create = useMutation({
    mutationFn: () => api.post("/rfq", {
      title: header.title,
      description: header.description || undefined,
      dueDate: header.dueDate || undefined,
      items: items
        .filter((i) => i.itemName.trim())
        .map((i) => ({
          itemName: i.itemName,
          unit: i.unit || undefined,
          quantity: parseInt(i.quantity) || 1,
          specification: i.specification || undefined,
        })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rfqs"] });
      onOpenChange(false);
      setHeader({ title: "", description: "", dueDate: "" });
      setItems([{ itemName: "", unit: "", quantity: "1", specification: "" }]);
      toast({ title: "RFQ created as draft" });
    },
    onError: () => toast({ title: "Failed to create RFQ", variant: "destructive" }),
  });

  const validItems = items.filter((i) => i.itemName.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Request for Quotation</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label>Title</Label>
            <Input value={header.title} onChange={(e) => setHeader((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Q1 pharmacy restock" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quotes due by</Label>
              <Input type="date" value={header.dueDate} onChange={(e) => setHeader((p) => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={header.description} onChange={(e) => setHeader((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Items to be quoted</Label>
              <Button type="button" size="sm" variant="outline"
                onClick={() => setItems((p) => [...p, { itemName: "", unit: "", quantity: "1", specification: "" }])}>
                <Plus className="mr-1 h-3 w-3" />Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_70px_1fr_32px] items-center gap-2">
                  <Input className="h-8 text-sm" placeholder="Item name" value={item.itemName}
                    onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, itemName: e.target.value } : x))} />
                  <Input className="h-8 text-sm" placeholder="Unit" value={item.unit}
                    onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, unit: e.target.value } : x))} />
                  <Input className="h-8 text-sm" type="number" min="1" value={item.quantity}
                    onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} />
                  <Input className="h-8 text-sm" placeholder="Specification" value={item.specification}
                    onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, specification: e.target.value } : x))} />
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                    disabled={items.length === 1}
                    onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!header.title.trim() || validItems === 0 || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Submit quote dialog ──────────────────────────────────────────────────────

function SubmitQuoteDialog({
  quote, items, open, onOpenChange,
}: { quote: RfqQuote | null; items: RfqItem[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState({ leadTimeDays: "", validUntil: "", notes: "" });

  // Seed the form from any pricing this vendor already gave, so an edit starts
  // from what they quoted rather than blank.
  const seeded = quote?.id;
  const [seededFor, setSeededFor] = useState<string | undefined>();
  if (open && seeded && seededFor !== seeded) {
    const next: Record<string, string> = {};
    for (const line of quote!.lines) next[line.rfqItemId] = Number(line.unitPrice).toString();
    setPrices(next);
    setMeta({
      leadTimeDays: quote!.leadTimeDays?.toString() ?? "",
      validUntil: quote!.validUntil?.split("T")[0] ?? "",
      notes: quote!.notes ?? "",
    });
    setSeededFor(seeded);
  }

  const submit = useMutation({
    mutationFn: () => api.post(`/rfq/quotes/${quote!.id}`, {
      lines: Object.entries(prices)
        .filter(([, v]) => v !== "" && !Number.isNaN(parseFloat(v)))
        .map(([rfqItemId, v]) => ({ rfqItemId, unitPrice: parseFloat(v) })),
      leadTimeDays: meta.leadTimeDays ? parseInt(meta.leadTimeDays) : undefined,
      validUntil: meta.validUntil || undefined,
      notes: meta.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rfq-detail"] });
      qc.invalidateQueries({ queryKey: ["rfq-comparison"] });
      onOpenChange(false);
      toast({ title: "Quote recorded" });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Failed to record quote", variant: "destructive" }),
  });

  const pricedCount = Object.values(prices).filter((v) => v !== "" && !Number.isNaN(parseFloat(v))).length;
  const runningTotal = items.reduce((sum, item) => {
    const p = parseFloat(prices[item.id] ?? "");
    return Number.isNaN(p) ? sum : sum + p * item.quantity;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Record Quote — {quote?.vendorName}</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="w-16 text-right">Qty</TableHead>
                <TableHead className="w-32">Unit Price</TableHead>
                <TableHead className="w-28 text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const p = parseFloat(prices[item.id] ?? "");
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      {item.itemName}
                      {item.unit && <span className="ml-1 text-xs text-muted-foreground">({item.unit})</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm" type="number" min="0" step="0.01"
                        value={prices[item.id] ?? ""}
                        onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="—" />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {Number.isNaN(p) ? "—" : naira(p * item.quantity)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">{pricedCount} of {items.length} items priced</span>
            <span className="font-mono font-semibold">{naira(runningTotal)}</span>
          </div>

          {pricedCount > 0 && pricedCount < items.length && (
            <p className="flex items-start gap-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              A partial quote is recorded but will not be comparable on total against vendors who priced everything.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lead time (days)</Label>
              <Input type="number" min="0" value={meta.leadTimeDays}
                onChange={(e) => setMeta((p) => ({ ...p, leadTimeDays: e.target.value }))} />
            </div>
            <div>
              <Label>Quote valid until</Label>
              <Input type="date" value={meta.validUntil}
                onChange={(e) => setMeta((p) => ({ ...p, validUntil: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={meta.notes} onChange={(e) => setMeta((p) => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={pricedCount === 0 || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Comparison matrix ────────────────────────────────────────────────────────

function ComparisonMatrix({ rfqId, canAward }: { rfqId: string; canAward: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [confirmQuoteId, setConfirmQuoteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Comparison>({
    queryKey: ["rfq-comparison", rfqId],
    queryFn: async () => (await api.get(`/rfq/${rfqId}/comparison`)).data,
  });

  const award = useMutation({
    mutationFn: (quoteId: string) => api.post(`/rfq/${rfqId}/award`, { quoteId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["rfq-detail"] });
      qc.invalidateQueries({ queryKey: ["rfq-comparison"] });
      qc.invalidateQueries({ queryKey: ["rfqs"] });
      setConfirmQuoteId(null);
      toast({ title: `Awarded — ${res.data.purchaseOrder.poNumber} raised` });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Failed to award", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!data) return null;

  if (data.vendors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No quotes received yet.
          {data.awaiting.length > 0 && ` Awaiting ${data.awaiting.length} vendor${data.awaiting.length === 1 ? "" : "s"}.`}
        </CardContent>
      </Card>
    );
  }

  const confirmTarget = data.vendors.find((v) => v.quoteId === confirmQuoteId);

  return (
    <div className="space-y-3">
      {data.awaiting.length > 0 && data.status !== "AWARDED" && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-2 py-3 text-sm text-amber-800">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Still awaiting a response from {data.awaiting.map((a) => a.vendorName).join(", ")}.
              Awarding now closes the RFQ to them.
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">Item</TableHead>
                <TableHead className="w-16 text-right">Qty</TableHead>
                {data.vendors.map((v) => (
                  <TableHead key={v.quoteId} className="min-w-36 text-right">
                    <div className="flex flex-col items-end gap-0.5 py-1">
                      <span className="font-medium">{v.vendorName}</span>
                      <div className="flex items-center gap-1">
                        {v.lowestTotal && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Lowest</Badge>}
                        {!v.complete && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Partial</Badge>}
                        {v.status === "AWARDED" && <Badge className="bg-emerald-600 text-white text-[10px]">Awarded</Badge>}
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.rfqItemId}>
                  <TableCell className="text-sm">
                    {row.itemName}
                    {row.unit && <span className="ml-1 text-xs text-muted-foreground">({row.unit})</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm">{row.quantity}</TableCell>
                  {row.cells.map((cell) => (
                    <TableCell key={cell.quoteId}
                      className={`text-right font-mono text-sm ${cell.isLowest ? "bg-emerald-50 font-semibold text-emerald-700" : ""}`}>
                      {naira(cell.unitPrice)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              <TableRow className="border-t-2 bg-muted/50">
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell />
                {data.vendors.map((v) => (
                  <TableCell key={v.quoteId}
                    className={`text-right font-mono text-sm font-semibold ${v.lowestTotal ? "text-emerald-700" : ""}`}>
                    {naira(v.totalAmount)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-sm text-muted-foreground">Lead time</TableCell>
                <TableCell />
                {data.vendors.map((v) => (
                  <TableCell key={v.quoteId} className="text-right text-sm">
                    {v.leadTimeDays != null ? `${v.leadTimeDays} days` : "—"}
                  </TableCell>
                ))}
              </TableRow>

              {canAward && (
                <TableRow>
                  <TableCell />
                  <TableCell />
                  {data.vendors.map((v) => (
                    <TableCell key={v.quoteId} className="text-right">
                      {v.status === "RECEIVED" ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => setConfirmQuoteId(v.quoteId)}>
                          <Award className="mr-1 h-3 w-3" />Award
                        </Button>
                      ) : null}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data.declined.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Declined: {data.declined.map((d) => d.vendorName).join(", ")}
        </p>
      )}

      <Dialog open={confirmQuoteId !== null} onOpenChange={(v) => !v && setConfirmQuoteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Award this RFQ?</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <strong>{confirmTarget?.vendorName}</strong> will be awarded at{" "}
              <strong>{naira(confirmTarget?.totalAmount ?? 0)}</strong>.
            </p>
            <p className="text-muted-foreground">
              A purchase order is raised immediately and the other quotes are marked rejected.
              This cannot be undone.
            </p>
            {confirmTarget && !confirmTarget.complete && (
              <p className="flex items-start gap-2 text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This vendor priced only {confirmTarget.itemsQuoted} of the requested items. The order
                will cover those lines only.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmQuoteId(null)}>Cancel</Button>
            <Button disabled={award.isPending} onClick={() => award.mutate(confirmQuoteId!)}>
              {award.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Award & Raise PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── RFQ detail ───────────────────────────────────────────────────────────────

function RfqDetailView({ rfqId, onBack }: { rfqId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendor, setVendor] = useState({ vendorName: "", vendorContact: "", vendorEmail: "" });
  const [quoteTarget, setQuoteTarget] = useState<RfqQuote | null>(null);

  const { data: rfq, isLoading } = useQuery<RfqDetail>({
    queryKey: ["rfq-detail", rfqId],
    queryFn: async () => (await api.get(`/rfq/${rfqId}`)).data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["rfq-detail"] });
    qc.invalidateQueries({ queryKey: ["rfq-comparison"] });
    qc.invalidateQueries({ queryKey: ["rfqs"] });
  };

  const invite = useMutation({
    mutationFn: () => api.post(`/rfq/${rfqId}/vendors`, {
      vendorName: vendor.vendorName,
      vendorContact: vendor.vendorContact || undefined,
      vendorEmail: vendor.vendorEmail || undefined,
    }),
    onSuccess: () => { invalidate(); setVendorOpen(false); setVendor({ vendorName: "", vendorContact: "", vendorEmail: "" }); toast({ title: "Vendor invited" }); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Failed to invite", variant: "destructive" }),
  });

  const send = useMutation({
    mutationFn: () => api.post(`/rfq/${rfqId}/send`),
    onSuccess: (res) => {
      invalidate();
      const { invited, emailed, withoutEmail } = res.data;
      toast({
        title: `RFQ sent to ${invited} vendor${invited === 1 ? "" : "s"}`,
        description: emailed === 0
          ? "No email was delivered — contact the vendors directly."
          : withoutEmail > 0
            ? `${emailed} emailed; ${withoutEmail} have no email on file.`
            : `${emailed} emailed.`,
      });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Failed to send", variant: "destructive" }),
  });

  const close  = useMutation({ mutationFn: () => api.post(`/rfq/${rfqId}/close`),  onSuccess: () => { invalidate(); toast({ title: "RFQ closed to new quotes" }); } });
  const cancel = useMutation({ mutationFn: () => api.post(`/rfq/${rfqId}/cancel`), onSuccess: () => { invalidate(); toast({ title: "RFQ cancelled" }); } });
  const decline = useMutation({
    mutationFn: (quoteId: string) => api.post(`/rfq/quotes/${quoteId}/decline`),
    onSuccess: () => { invalidate(); toast({ title: "Marked as declined" }); },
  });
  const removeVendor = useMutation({
    mutationFn: (quoteId: string) => api.delete(`/rfq/vendors/${quoteId}`),
    onSuccess: () => { invalidate(); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Cannot remove", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!rfq) return null;

  const isOpen       = rfq.status === "DRAFT" || rfq.status === "SENT";
  const canQuote     = rfq.status === "SENT" || rfq.status === "CLOSED";
  const canAward     = rfq.status === "SENT" || rfq.status === "CLOSED";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button size="icon" variant="ghost" className="mt-0.5 h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{rfq.title}</h2>
              <Badge className={STATUS_COLORS[rfq.status] ?? ""}>{rfq.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {rfq.rfqNumber}
              {rfq.dueDate && ` · quotes due ${rfq.dueDate.split("T")[0]}`}
              {rfq.purchaseOrder && ` · ${rfq.purchaseOrder.poNumber}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {rfq.status === "DRAFT" && (
            <Button size="sm" disabled={rfq.quotes.length === 0 || send.isPending} onClick={() => send.mutate()}>
              {send.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              Send to Vendors
            </Button>
          )}
          {rfq.status === "SENT" && (
            <Button size="sm" variant="outline" onClick={() => close.mutate()}>
              <Lock className="mr-1 h-4 w-4" />Close Quoting
            </Button>
          )}
          {rfq.status !== "AWARDED" && rfq.status !== "CANCELLED" && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => cancel.mutate()}>
              <Ban className="mr-1 h-4 w-4" />Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Requested Items ({rfq.items.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Specification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfq.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm">{i.itemName}</TableCell>
                  <TableCell className="text-sm">{i.unit ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">{i.quantity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.specification ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vendors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Vendors ({rfq.quotes.length})</CardTitle>
          {isOpen && (
            <Button size="sm" variant="outline" onClick={() => setVendorOpen(true)}>
              <UserPlus className="mr-1 h-4 w-4" />Invite Vendor
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {rfq.quotes.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              No vendors invited yet. Invite at least one before sending the RFQ.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Quoted Total</TableHead>
                  <TableHead className="text-right">Lead Time</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfq.quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-sm font-medium">{q.vendorName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {q.vendorEmail ?? q.vendorContact ?? "—"}
                    </TableCell>
                    <TableCell><Badge className={QUOTE_STATUS_COLORS[q.status] ?? ""}>{q.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {q.status === "RECEIVED" || q.status === "AWARDED" || q.status === "REJECTED"
                        ? naira(q.totalAmount) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {q.leadTimeDays != null ? `${q.leadTimeDays} d` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canQuote && q.status !== "AWARDED" && q.status !== "REJECTED" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setQuoteTarget(q)}>
                            {q.status === "RECEIVED" ? "Edit Quote" : "Record Quote"}
                          </Button>
                        )}
                        {canQuote && q.status === "PENDING" && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Vendor declined"
                            onClick={() => decline.mutate(q.id)}>
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        )}
                        {isOpen && q.status === "PENDING" && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                            onClick={() => removeVendor.mutate(q.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Comparison */}
      {rfq.status !== "DRAFT" && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Quote Comparison</h3>
          <ComparisonMatrix rfqId={rfqId} canAward={canAward} />
        </div>
      )}

      <Dialog open={vendorOpen} onOpenChange={setVendorOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Invite Vendor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Vendor name</Label>
              <Input value={vendor.vendorName} onChange={(e) => setVendor((p) => ({ ...p, vendorName: e.target.value }))} />
            </div>
            <div>
              <Label>Email (receives the RFQ)</Label>
              <Input type="email" value={vendor.vendorEmail} onChange={(e) => setVendor((p) => ({ ...p, vendorEmail: e.target.value }))} />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input value={vendor.vendorContact} onChange={(e) => setVendor((p) => ({ ...p, vendorContact: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVendorOpen(false)}>Cancel</Button>
            <Button disabled={!vendor.vendorName.trim() || invite.isPending} onClick={() => invite.mutate()}>
              {invite.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubmitQuoteDialog
        quote={quoteTarget}
        items={rfq.items}
        open={quoteTarget !== null}
        onOpenChange={(v) => !v && setQuoteTarget(null)}
      />
    </div>
  );
}

// ── Page root ────────────────────────────────────────────────────────────────

export function RfqPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const { data: rfqs = [], isLoading } = useQuery<RfqListRow[]>({
    queryKey: ["rfqs", statusFilter],
    queryFn: async () => (await api.get(`/rfq${statusFilter ? `?status=${statusFilter}` : ""}`)).data,
  });

  if (selected) {
    return (
      <div className="p-6">
        <RfqDetailView rfqId={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Requests for Quotation</h1>
            <p className="text-sm text-muted-foreground">Invite vendors, compare quotes side by side, award to one</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" />New RFQ</Button>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {["DRAFT", "SENT", "CLOSED", "AWARDED", "CANCELLED"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RFQ</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Vendors</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfqs.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No RFQs yet.</TableCell></TableRow>
                )}
                {rfqs.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r.id)}>
                    <TableCell className="font-mono text-xs">{r.rfqNumber}</TableCell>
                    <TableCell className="text-sm font-medium">{r.title}</TableCell>
                    <TableCell className="text-right text-sm">{r._count.items}</TableCell>
                    <TableCell className="text-right text-sm">{r._count.quotes}</TableCell>
                    <TableCell className="text-sm">{r.dueDate ? r.dueDate.split("T")[0] : "—"}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.purchaseOrder?.poNumber ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CreateRfqDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
