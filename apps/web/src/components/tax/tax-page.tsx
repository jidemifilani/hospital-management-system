"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt, Loader2, Plus, Trash2, Pencil, FileCheck, BarChart2, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const naira = (v: string | number) =>
  `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const TYPE_LABELS: Record<string, string> = {
  OUTPUT_VAT: "Output VAT",
  INPUT_VAT: "Input VAT",
  WITHHOLDING: "Withholding",
  CUSTOM: "Custom",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
};

interface TaxCode { id: string; code: string; name: string; rate: string; type: string; isActive: boolean }
interface TaxReturn { id: string; year: number; month: number; outputVat: string; inputVat: string; netVat: string; status: string; dueDate?: string; submittedAt?: string }

// ── Tax Codes tab ───────────────────────────────────────────────────────────

function CodesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxCode | null>(null);
  const [form, setForm] = useState({ code: "", name: "", rate: "", type: "OUTPUT_VAT" });

  const { data: codes = [], isLoading } = useQuery<TaxCode[]>({
    queryKey: ["tax-codes"],
    queryFn: async () => (await api.get("/tax/codes")).data,
  });

  const seed = useMutation({
    mutationFn: () => api.post("/tax/codes/seed-defaults"),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["tax-codes"] }); toast({ title: `Seeded ${res.data.created} default codes` }); },
  });

  const save = useMutation({
    mutationFn: (d: typeof form) =>
      editing
        ? api.patch(`/tax/codes/${editing.id}`, { name: d.name, rate: parseFloat(d.rate), type: d.type })
        : api.post("/tax/codes", { ...d, rate: parseFloat(d.rate) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-codes"] }); setOpen(false); toast({ title: editing ? "Code updated" : "Code created" }); },
    onError: () => toast({ title: "Failed to save code", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/tax/codes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tax-codes"] }),
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Cannot delete", variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: (c: TaxCode) => api.patch(`/tax/codes/${c.id}`, { isActive: !c.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tax-codes"] }),
  });

  function openCreate() { setEditing(null); setForm({ code: "", name: "", rate: "", type: "OUTPUT_VAT" }); setOpen(true); }
  function openEdit(c: TaxCode) { setEditing(c); setForm({ code: c.code, name: c.name, rate: Number(c.rate).toString(), type: c.type }); setOpen(true); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Define VAT, withholding, and other tax codes for your organisation.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => seed.mutate()} disabled={seed.isPending}>
            {seed.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Seed Defaults
          </Button>
          <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-4 w-4" />Add Code</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No tax codes. Use "Seed Defaults" to add Nigerian standard codes.</TableCell></TableRow>
                )}
                {codes.map((c) => (
                  <TableRow key={c.id} className={!c.isActive ? "opacity-50" : ""}>
                    <TableCell><Badge variant="outline" className="font-mono">{c.code}</Badge></TableCell>
                    <TableCell className="text-sm">{c.name}</TableCell>
                    <TableCell className="font-mono text-sm">{Number(c.rate).toFixed(2)}%</TableCell>
                    <TableCell><Badge variant="secondary">{TYPE_LABELS[c.type] ?? c.type}</Badge></TableCell>
                    <TableCell>
                      <Badge className={c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggle.mutate(c)}>
                          <CheckCircle2 className={`h-3.5 w-3.5 ${c.isActive ? "text-emerald-600" : "text-slate-400"}`} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit Tax Code" : "New Tax Code"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. VAT75" />
              </div>
            )}
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. VAT 7.5%" />
            </div>
            <div>
              <Label>Rate (%)</Label>
              <Input type="number" step="0.01" min="0" max="100" value={form.rate}
                onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))} placeholder="e.g. 7.5" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={(!editing && !form.code) || !form.name || !form.rate || save.isPending}
              onClick={() => save.mutate(form)}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tax Returns tab ─────────────────────────────────────────────────────────

function ReturnsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({ year: now.getFullYear().toString(), month: (now.getMonth() + 1).toString(), notes: "" });
  const [previewYear, setPreviewYear] = useState(now.getFullYear().toString());
  const [previewMonth, setPreviewMonth] = useState((now.getMonth() + 1).toString());

  const { data: returns = [], isLoading } = useQuery<TaxReturn[]>({
    queryKey: ["tax-returns"],
    queryFn: async () => (await api.get("/tax/returns")).data,
  });

  const { data: preview } = useQuery({
    queryKey: ["tax-summary", previewYear, previewMonth],
    queryFn: async () => (await api.get(`/tax/period-summary?year=${previewYear}&month=${previewMonth}`)).data,
    enabled: Boolean(previewYear && previewMonth),
  });

  const create = useMutation({
    mutationFn: (d: typeof form) => api.post("/tax/returns", { year: parseInt(d.year), month: parseInt(d.month), notes: d.notes || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-returns"] }); setOpen(false); toast({ title: "Tax return created" }); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Failed to create", variant: "destructive" }),
  });

  const submit = useMutation({
    mutationFn: (id: string) => api.patch(`/tax/returns/${id}`, { status: "SUBMITTED" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tax-returns"] }),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => api.patch(`/tax/returns/${id}`, { status: "PAID" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tax-returns"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">File monthly VAT returns. Output VAT − Input VAT = Net payable to FIRS.</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />New Return</Button>
      </div>

      {/* Period preview card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Period Summary Preview</CardTitle>
            <div className="flex gap-2">
              <Select value={previewMonth} onValueChange={setPreviewMonth}>
                <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-7 w-20 text-xs" type="number" value={previewYear} onChange={(e) => setPreviewYear(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {preview ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xs text-muted-foreground">Output VAT</p><p className="text-lg font-semibold">{naira(preview.outputVat)}</p></div>
              <div><p className="text-xs text-muted-foreground">Input VAT</p><p className="text-lg font-semibold">{naira(preview.inputVat)}</p></div>
              <div><p className="text-xs text-muted-foreground">Net Payable</p>
                <p className={`text-lg font-semibold ${Number(preview.netVat) >= 0 ? "text-red-600" : "text-emerald-600"}`}>{naira(preview.netVat)}</p>
              </div>
            </div>
          ) : <p className="text-sm text-center text-muted-foreground">Select period to preview</p>}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Output VAT</TableHead>
                  <TableHead className="text-right">Input VAT</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No tax returns filed yet.</TableCell></TableRow>
                )}
                {returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{MONTHS[r.month - 1]} {r.year}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{naira(r.outputVat)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{naira(r.inputVat)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{naira(r.netVat)}</TableCell>
                    <TableCell className="text-sm">{r.dueDate ? r.dueDate.split("T")[0] : "—"}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {r.status === "DRAFT" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => submit.mutate(r.id)}>
                          <FileCheck className="mr-1 h-3 w-3" />Submit
                        </Button>
                      )}
                      {r.status === "SUBMITTED" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markPaid.mutate(r.id)}>
                          <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>File Tax Return</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Month</Label>
                <Select value={form.month} onValueChange={(v) => setForm((p) => ({ ...p, month: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">This will compute output/input VAT from all tax applications in the selected month and create a return record.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={create.isPending} onClick={() => create.mutate(form)}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Page root ────────────────────────────────────────────────────────────────

export function TaxPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Tax Management</h1>
          <p className="text-sm text-muted-foreground">VAT, withholding tax codes and monthly FIRS returns</p>
        </div>
      </div>

      <Tabs defaultValue="codes">
        <TabsList>
          <TabsTrigger value="codes"><BarChart2 className="mr-1 h-3 w-3" />Tax Codes</TabsTrigger>
          <TabsTrigger value="returns"><FileCheck className="mr-1 h-3 w-3" />Returns</TabsTrigger>
        </TabsList>
        <TabsContent value="codes" className="mt-4"><CodesTab /></TabsContent>
        <TabsContent value="returns" className="mt-4"><ReturnsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
