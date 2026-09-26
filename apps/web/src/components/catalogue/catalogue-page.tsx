"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tags, Loader2, Plus, Pencil } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const naira = (v: string | number | null) =>
  v === null || v === undefined
    ? "—"
    : `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CATEGORIES = [
  "CONSULTATION", "LABORATORY", "RADIOLOGY", "PROCEDURE", "SURGERY",
  "BED_CHARGE", "NURSING", "PHARMACY", "CONSUMABLE", "AMBULANCE", "OTHER",
];

interface ServiceItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unitPrice: string;
  nhisPrice: string | null;
  hmoPrice: string | null;
  unit: string | null;
  isActive: boolean;
}

function ItemDialog({ item, onClose }: { item: ServiceItem | null; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = Boolean(item);
  const [form, setForm] = useState({
    code: item?.code ?? "",
    name: item?.name ?? "",
    category: item?.category ?? "CONSULTATION",
    unitPrice: item?.unitPrice ?? "",
    nhisPrice: item?.nhisPrice ?? "",
    hmoPrice: item?.hmoPrice ?? "",
    unit: item?.unit ?? "",
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name: form.name,
        category: form.category,
        unitPrice: Number(form.unitPrice),
        nhisPrice: form.nhisPrice === "" ? null : Number(form.nhisPrice),
        hmoPrice: form.hmoPrice === "" ? null : Number(form.hmoPrice),
        unit: form.unit || undefined,
      };
      if (isEdit) return api.patch(`/catalogue/${item!.id}`, payload);
      return api.post("/catalogue", { ...payload, code: form.code });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogue"] });
      toast({ title: isEdit ? "Price updated" : "Service added" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${item!.code}` : "Add Service"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!isEdit && (
            <div className="space-y-1">
              <Label className="text-xs">Code *</Label>
              <Input
                placeholder="e.g. LAB-FBC"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Private ₦ *</Label>
              <Input
                type="number"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">NHIS ₦</Label>
              <Input
                type="number"
                value={form.nhisPrice}
                onChange={(e) => setForm({ ...form, nhisPrice: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">HMO ₦</Label>
              <Input
                type="number"
                value={form.hmoPrice}
                onChange={(e) => setForm({ ...form, hmoPrice: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Unit</Label>
            <Input
              placeholder="e.g. per night"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <p className="rounded bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            NHIS and HMO patients are billed at their scheme tariff automatically when one is set.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.name || !form.unitPrice || (!isEdit && !form.code) || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CataloguePage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["catalogue", category, search],
    queryFn: async () =>
      (
        await api.get("/catalogue", {
          params: { ...(category !== "all" ? { category } : {}), ...(search ? { search } : {}) },
        })
      ).data,
  });

  const items: ServiceItem[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Tags className="h-6 w-6" /> Service Catalogue
          </h1>
          <p className="text-sm text-muted-foreground">
            The price list every automatic charge is calculated from.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Service
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name or code…"
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {items.length} service{items.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Private</TableHead>
                  <TableHead className="text-right">NHIS</TableHead>
                  <TableHead className="text-right">HMO</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.code}</TableCell>
                    <TableCell className="text-sm">
                      {i.name}
                      {i.unit && <span className="ml-1 text-xs text-muted-foreground">({i.unit})</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {i.category.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{naira(i.unitPrice)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{naira(i.nhisPrice)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{naira(i.hmoPrice)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(i)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showNew && <ItemDialog item={null} onClose={() => setShowNew(false)} />}
      {editing && <ItemDialog item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
