"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Factory, Loader2, Plus, AlertTriangle, CheckCircle2, XCircle, Trash2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
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

const naira = (v: string | number | null | undefined) =>
  `₦${Number(v ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BOM_TYPES = ["STERILISATION", "COMPOUNDING", "ASSEMBLY"];

const STATUS_STYLE: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

const pretty = (v: string) =>
  v.replace(/_/g, " ").toLowerCase().replace(/^./, (m) => m.toUpperCase());

function useLookups() {
  const { data: items = [] } = useQuery({
    queryKey: ["inv-items"],
    queryFn: async () => (await api.get("/inventory/items")).data,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["inv-locations"],
    queryFn: async () => (await api.get("/inventory/locations")).data,
  });
  return { items, locations };
}

function NewRecipeDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { items } = useLookups();
  const [form, setForm] = useState({
    code: "", name: "", type: "STERILISATION",
    outputItemId: "", outputQuantity: "1", shelfLifeDays: "180",
  });
  const [lines, setLines] = useState<{ itemId: string; quantity: string }[]>([
    { itemId: "", quantity: "1" },
  ]);

  const create = useMutation({
    mutationFn: () =>
      api.post("/production/boms", {
        code: form.code,
        name: form.name,
        type: form.type,
        outputItemId: form.outputItemId,
        outputQuantity: Number(form.outputQuantity),
        ...(form.shelfLifeDays ? { shelfLifeDays: Number(form.shelfLifeDays) } : {}),
        lines: lines
          .filter((l) => l.itemId && Number(l.quantity) > 0)
          .map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boms"] });
      toast({ title: "Recipe saved" });
      onClose();
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not save the recipe"), variant: "destructive" }),
  });

  const usable = lines.filter((l) => l.itemId && Number(l.quantity) > 0);
  const usesOwnOutput = usable.some((l) => l.itemId === form.outputItemId);
  const estimated = usable.reduce((sum, l) => {
    const item = items.find((i: any) => i.id === l.itemId);
    return sum + Number(item?.averageCost ?? 0) * Number(l.quantity);
  }, 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>New Recipe</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="bom-code" className="text-xs">Code *</Label>
              <Input id="bom-code" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kind</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOM_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>{pretty(tp)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bom-name" className="text-xs">Name *</Label>
            <Input id="bom-name" placeholder="Minor surgery pack" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Makes *</Label>
            <Select value={form.outputItemId}
              onValueChange={(v) => setForm({ ...form, outputItemId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {items.map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="bom-qty" className="text-xs">How many per batch *</Label>
              <Input id="bom-qty" type="number" value={form.outputQuantity}
                onChange={(e) => setForm({ ...form, outputQuantity: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bom-shelf" className="text-xs">Shelf life (days)</Label>
              <Input id="bom-shelf" type="number" value={form.shelfLifeDays}
                onChange={(e) => setForm({ ...form, shelfLifeDays: e.target.value })} />
              <p className="text-xs text-muted-foreground">
                Sets the expiry on each batch made.
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded border p-3">
            <p className="text-xs font-medium">Materials per batch</p>
            {lines.map((line, index) => (
              <div key={index} className="flex gap-2">
                <Select value={line.itemId}
                  onValueChange={(v) => {
                    const next = [...lines];
                    next[index] = { ...next[index]!, itemId: v };
                    setLines(next);
                  }}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Material…" /></SelectTrigger>
                  <SelectContent>
                    {items.map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input aria-label={`Quantity for material ${index + 1}`} type="number"
                  className="w-24" value={line.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[index] = { ...next[index]!, quantity: e.target.value };
                    setLines(next);
                  }} />
                <Button variant="ghost" size="sm" aria-label={`Remove material ${index + 1}`}
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm"
              onClick={() => setLines([...lines, { itemId: "", quantity: "1" }])}>
              <Plus className="mr-1 h-3 w-3" /> Add material
            </Button>

            {usesOwnOutput && (
              <p className="text-sm text-red-600">
                A recipe cannot use what it makes as one of its own materials.
              </p>
            )}
            {estimated > 0 && (
              <p className="text-xs text-muted-foreground">
                Materials cost about {naira(estimated)} per batch — what each unit produced
                will be worth.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={
              !form.code || !form.name || !form.outputItemId ||
              usable.length === 0 || usesOwnOutput || create.isPending
            }
            onClick={() => create.mutate()}
          >
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Recipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanRunDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { locations } = useLookups();
  const [form, setForm] = useState({ bomId: "", quantity: "10", locationId: "" });

  const { data: boms = [] } = useQuery({
    queryKey: ["boms"],
    queryFn: async () => (await api.get("/production/boms")).data,
  });

  const { data: requirements, isFetching } = useQuery({
    queryKey: ["bom-requirements", form.bomId, form.quantity, form.locationId],
    queryFn: async () =>
      (await api.get(`/production/boms/${form.bomId}/requirements`, {
        params: { quantity: Number(form.quantity), locationId: form.locationId },
      })).data,
    enabled: Boolean(form.bomId && form.locationId && Number(form.quantity) > 0),
    retry: false,
  });

  const plan = useMutation({
    mutationFn: () =>
      api.post("/production/runs", {
        bomId: form.bomId,
        quantity: Number(form.quantity),
        locationId: form.locationId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-runs"] });
      qc.invalidateQueries({ queryKey: ["production-summary"] });
      toast({ title: "Run planned" });
      onClose();
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not plan the run"), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Plan a Run</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Recipe *</Label>
            <Select value={form.bomId} onValueChange={(v) => setForm({ ...form, bomId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {boms.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} → {b.outputItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="run-qty" className="text-xs">How many *</Label>
              <Input id="run-qty" type="number" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Where *</Label>
              <Select value={form.locationId}
                onValueChange={(v) => setForm({ ...form, locationId: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}

          {requirements && !isFetching && (
            <div className="space-y-1 rounded border p-3">
              <p className="text-xs font-medium">What this needs</p>
              {requirements.requirements.map((r: any) => (
                <div key={r.itemId} className="flex justify-between text-xs">
                  <span>{r.name}</span>
                  <span className={r.short > 0 ? "font-medium text-red-600" : "text-muted-foreground"}>
                    {r.needed} needed · {r.available} on hand
                    {r.short > 0 && ` · short ${r.short}`}
                  </span>
                </div>
              ))}
              {!requirements.canProduce && (
                <p className="flex items-center gap-1 pt-1 text-sm text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  Not enough on the shelf. The run can still be planned, but it cannot be
                  completed until the materials are there.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.bomId || !form.locationId || plan.isPending}
            onClick={() => plan.mutate()}>
            {plan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Plan Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteRunDialog({ run, onClose }: { run: any; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    quantityProduced: String(run.quantityPlanned),
    batchNumber: "",
  });

  const complete = useMutation({
    mutationFn: () =>
      api.post(`/production/runs/${run.id}/complete`, {
        quantityProduced: Number(form.quantityProduced),
        ...(form.batchNumber ? { batchNumber: form.batchNumber } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-runs"] });
      qc.invalidateQueries({ queryKey: ["production-summary"] });
      qc.invalidateQueries({ queryKey: ["inv-stock"] });
      toast({
        title: "Run completed",
        description: "Materials drawn and the finished item put into stock.",
      });
      onClose();
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not complete the run"), variant: "destructive" }),
  });

  const shortYield = Number(form.quantityProduced) < run.quantityPlanned;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Complete {run.runNumber}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{run.bom.name}</p>
            <p className="text-xs text-muted-foreground">
              Planned {run.quantityPlanned} {run.bom.outputItem.unit} of{" "}
              {run.bom.outputItem.name} at {run.location.name}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cmp-qty" className="text-xs">How many were actually made *</Label>
            <Input id="cmp-qty" type="number" value={form.quantityProduced}
              onChange={(e) => setForm({ ...form, quantityProduced: e.target.value })} />
            {shortYield && (
              <p className="text-xs text-amber-700">
                Fewer than planned. Only the materials for {form.quantityProduced} will be
                drawn, so the cost per unit stays the same.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cmp-batch" className="text-xs">Batch number</Label>
            <Input id="cmp-batch" value={form.batchNumber}
              onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              Required if what is being made is batch-tracked. The expiry comes from the
              recipe&apos;s shelf life.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={Number(form.quantityProduced) <= 0 || complete.isPending}
            onClick={() => complete.mutate()}>
            {complete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle2 className="mr-2 h-4 w-4" /> Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductionPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<"recipe" | "plan" | null>(null);
  const [completing, setCompleting] = useState<any>(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["production-runs"],
    queryFn: async () => (await api.get("/production/runs")).data,
  });
  const { data: boms = [] } = useQuery({
    queryKey: ["boms"],
    queryFn: async () => (await api.get("/production/boms")).data,
  });
  const { data: summary } = useQuery({
    queryKey: ["production-summary"],
    queryFn: async () => (await api.get("/production/summary")).data,
  });

  const cancel = useMutation({
    mutationFn: (id: string) =>
      api.post(`/production/runs/${id}/cancel`, { reason: "Cancelled from the production board" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-runs"] });
      qc.invalidateQueries({ queryKey: ["production-summary"] });
      toast({ title: "Run cancelled" });
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not cancel"), variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Factory className="h-6 w-6" /> Production
          </h1>
          <p className="text-sm text-muted-foreground">
            Sterile packs and compounded preparations made in-house.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialog("recipe")}>
            <Plus className="mr-2 h-4 w-4" /> New Recipe
          </Button>
          <Button onClick={() => setDialog("plan")}>
            <Factory className="mr-2 h-4 w-4" /> Plan Run
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        {[
          { label: "Planned", value: summary?.planned ?? 0 },
          { label: "Completed", value: summary?.completed ?? 0 },
          { label: "Units Made", value: summary?.unitsProduced ?? 0 },
          { label: "Material Value", value: naira(summary?.materialValue ?? 0), wide: true },
          {
            label: "Expiring Soon",
            value: summary?.expiringWithin30Days ?? 0,
            alert: (summary?.expiringWithin30Days ?? 0) > 0,
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="px-4 pb-1 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`font-bold ${s.wide ? "text-lg" : "text-2xl"} ${s.alert ? "text-amber-600" : ""}`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run</TableHead>
                      <TableHead>Makes</TableHead>
                      <TableHead>Where</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Materials</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                          Nothing made yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {runs.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.runNumber}</TableCell>
                        <TableCell className="text-sm">
                          {r.bom.outputItem.name}
                          <div className="text-xs text-muted-foreground">{r.bom.name}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.location.name}</TableCell>
                        <TableCell className="text-right text-sm">
                          {r.quantityProduced ?? r.quantityPlanned} {r.bom.outputItem.unit}
                          {r.quantityProduced !== null &&
                            r.quantityProduced !== r.quantityPlanned && (
                              <div className="text-xs text-amber-700">
                                planned {r.quantityPlanned}
                              </div>
                            )}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {r.status === "COMPLETED" ? naira(r.materialCost) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_STYLE[r.status] ?? ""}>{pretty(r.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {["PLANNED", "IN_PROGRESS"].includes(r.status) && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => setCompleting(r)}>
                                Complete
                              </Button>
                              <Button size="sm" variant="ghost" aria-label={`Cancel ${r.runNumber}`}
                                onClick={() => cancel.mutate(r.id)}>
                                <XCircle className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipes" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Makes</TableHead>
                    <TableHead>Materials</TableHead>
                    <TableHead className="text-right">Shelf life</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boms.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        No recipes yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {boms.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{b.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{b.code}</div>
                      </TableCell>
                      <TableCell className="text-sm">{pretty(b.type)}</TableCell>
                      <TableCell className="text-sm">
                        {b.outputQuantity} × {b.outputItem.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.lines.map((l: any) => `${l.quantity} × ${l.item.name}`).join(", ")}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {b.shelfLifeDays ? `${b.shelfLifeDays} days` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dialog === "recipe" && <NewRecipeDialog onClose={() => setDialog(null)} />}
      {dialog === "plan" && <PlanRunDialog onClose={() => setDialog(null)} />}
      {completing && <CompleteRunDialog run={completing} onClose={() => setCompleting(null)} />}
    </div>
  );
}
