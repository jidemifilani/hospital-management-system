"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Loader2, Plus, Minus, Trash2, Receipt, LockOpen, Lock } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const naira = (v: string | number) =>
  `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TENDERS = ["CASH", "POS_CARD", "BANK_TRANSFER", "MOBILE_MONEY"];

interface Item {
  id: string;
  code: string;
  name: string;
  unit: string;
  sellingPrice: string | null;
  levels: { quantity: number; location: { code: string; name: string } }[];
}

interface CartLine {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  available: number;
}

function OpenTillDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [terminalName, setTerminalName] = useState("Front Desk");
  const [openingFloat, setOpeningFloat] = useState("5000");

  const open = useMutation({
    mutationFn: () =>
      api.post("/pos/session/open", { terminalName, openingFloat: Number(openingFloat) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos-session"] });
      toast({ title: "Till opened" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Open Till</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="till-terminal" className="text-xs">Terminal</Label>
            <Input id="till-terminal" value={terminalName} onChange={(e) => setTerminalName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="till-float" className="text-xs">Opening float (₦)</Label>
            <Input
              id="till-float"
              type="number"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Count the drawer before you start — the closing check compares against this.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={open.isPending} onClick={() => open.mutate()}>
            {open.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Open Till
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseTillDialog({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");

  const { data: summary } = useQuery({
    queryKey: ["pos-summary", sessionId],
    queryFn: async () => (await api.get(`/pos/session/${sessionId}/summary`)).data,
  });

  const close = useMutation({
    mutationFn: () =>
      api.post(`/pos/session/${sessionId}/close`, { closingCounted: Number(counted), notes }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["pos-session"] });
      const v = Number(res.data.variance);
      toast({
        title: "Till closed",
        description:
          v === 0
            ? "Drawer reconciles exactly."
            : `${v < 0 ? "Short" : "Over"} by ${naira(Math.abs(v))}`,
        variant: v === 0 ? undefined : "destructive",
      });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const expected = Number(summary?.expectedInDrawer ?? 0);
  const variance = counted === "" ? null : Number(counted) - expected;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Close Till</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {summary && (
            <div className="space-y-1 rounded border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opening float</span>
                <span>{naira(summary.openingFloat)}</span>
              </div>
              {summary.byMethod.map((m: any) => (
                <div key={m.method} className="flex justify-between">
                  <span className="text-muted-foreground">{m.method.replace(/_/g, " ")}</span>
                  <span>{naira(m.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1 font-medium">
                <span>Expected in drawer</span>
                <span>{naira(expected)}</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="till-counted" className="text-xs">Counted in drawer (₦) *</Label>
            <Input
              id="till-counted"
              type="number"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              placeholder="Count the cash, then enter it"
            />
          </div>

          {variance !== null && variance !== 0 && (
            <p
              className={`rounded px-3 py-2 text-sm ${
                variance < 0
                  ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
            >
              {variance < 0 ? "Short" : "Over"} by {naira(Math.abs(variance))} — this is recorded
              against the shift.
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="till-notes" className="text-xs">Notes</Label>
            <Input id="till-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={counted === "" || close.isPending} onClick={() => close.mutate()}>
            {close.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Close Till
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PosPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState("CASH");
  const [tendered, setTendered] = useState("");
  const [locationId, setLocationId] = useState<string>("");

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["pos-session"],
    queryFn: async () => (await api.get("/pos/session/current")).data,
  });

  const { data: locations = [] } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ["pos-locations"],
    queryFn: async () => (await api.get("/inventory/locations")).data,
    enabled: Boolean(session),
  });

  // Default to the pharmacy counter, which is where sales normally come from.
  const activeLocation =
    locationId || locations.find((l) => l.code === "PHARMACY")?.id || locations[0]?.id || "";

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["pos-items", search],
    queryFn: async () =>
      (await api.get("/inventory/items", { params: { search: search || undefined } })).data,
    enabled: Boolean(session),
  });

  const locationCode = locations.find((l) => l.id === activeLocation)?.code ?? "";

  /** Stock at the counter being sold from — not the hospital-wide total. */
  const atThisCounter = (item: Item) =>
    item.levels
      .filter((l) => !locationCode || l.location.code === locationCode)
      .reduce((sum, l) => sum + l.quantity, 0);

  const sellable = useMemo(
    () => items.filter((i) => i.sellingPrice && Number(i.sellingPrice) > 0),
    [items],
  );

  const total = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const change = method === "CASH" && tendered ? Number(tendered) - total : null;

  const sell = useMutation({
    mutationFn: () =>
      api.post("/pos/sales", {
        sessionId: session.id,
        method,
        locationId: activeLocation || undefined,
        amountTendered: method === "CASH" && tendered ? Number(tendered) : undefined,
        lines: cart.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      }),
    onSuccess: (res) => {
      toast({
        title: `Receipt ${res.data.receiptNumber}`,
        description:
          res.data.changeGiven && Number(res.data.changeGiven) > 0
            ? `Change due ${naira(res.data.changeGiven)}`
            : `${naira(res.data.total)} taken`,
      });
      setCart([]);
      setTendered("");
      qc.invalidateQueries({ queryKey: ["pos-items"] });
      qc.invalidateQueries({ queryKey: ["pos-sales"] });
    },
    onError: (e: Error) => {
      const detail = e instanceof ApiError ? (e.data?.message as string) : undefined;
      toast({ title: detail ?? e.message, variant: "destructive" });
    },
  });

  const addToCart = (item: Item) => {
    const available = atThisCounter(item);
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          unitPrice: Number(item.sellingPrice),
          quantity: 1,
          available,
        },
      ];
    });
  };

  const setQty = (itemId: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((l) => (l.itemId === itemId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );

  if (sessionLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShoppingCart className="h-6 w-6" /> Point of Sale
          </h1>
          <p className="text-sm text-muted-foreground">Counter sales for pharmacy and sundries.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Lock className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No till is open. Count your drawer and open one to start selling.
            </p>
            <Button onClick={() => setShowOpen(true)}>
              <LockOpen className="mr-2 h-4 w-4" /> Open Till
            </Button>
          </CardContent>
        </Card>
        {showOpen && <OpenTillDialog onClose={() => setShowOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShoppingCart className="h-6 w-6" /> Point of Sale
          </h1>
          <p className="text-sm text-muted-foreground">
            {session.sessionNumber} · {session.terminalName} · float {naira(session.openingFloat)}
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowClose(true)}>
          <Lock className="mr-2 h-4 w-4" /> Close Till
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Select value={activeLocation} onValueChange={setLocationId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Selling from…" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search by name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[420px] overflow-y-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">In stock</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellable.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Nothing here has a selling price set.
                      </TableCell>
                    </TableRow>
                  )}
                  {sellable.map((item) => {
                    const available = atThisCounter(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{item.code}</div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          <span className={available <= 0 ? "text-red-600" : ""}>
                            {available} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {naira(item.sellingPrice!)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={available <= 0}
                            onClick={() => addToCart(item)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing scanned yet.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((line) => (
                  <div key={line.itemId} className="flex items-center gap-2 rounded border p-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{line.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {naira(line.unitPrice)} each
                        {line.quantity > line.available && (
                          <span className="ml-1 text-red-600">
                            · only {line.available} in stock
                          </span>
                        )}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setQty(line.itemId, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{line.quantity}</span>
                    <Button size="icon" variant="ghost" onClick={() => setQty(line.itemId, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setCart((p) => p.filter((l) => l.itemId !== line.itemId))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-bold">{naira(total)}</span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tender</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TENDERS.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {method === "CASH" && (
              <div className="space-y-1">
                <Label htmlFor="pos-tendered" className="text-xs">Cash received (₦)</Label>
                <Input
                  id="pos-tendered"
                  type="number"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                />
                {change !== null && (
                  <p className={`text-sm ${change < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {change < 0
                      ? `Short by ${naira(Math.abs(change))}`
                      : `Change ${naira(change)}`}
                  </p>
                )}
              </div>
            )}

            <Button
              className="w-full"
              disabled={
                cart.length === 0 ||
                sell.isPending ||
                (method === "CASH" && change !== null && change < 0)
              }
              onClick={() => sell.mutate()}
            >
              {sell.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Receipt className="mr-2 h-4 w-4" />
              Take Payment
            </Button>
          </CardContent>
        </Card>
      </div>

      {showClose && <CloseTillDialog sessionId={session.id} onClose={() => setShowClose(false)} />}
    </div>
  );
}
