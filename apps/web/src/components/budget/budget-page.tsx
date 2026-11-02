"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Minus } from "lucide-react";
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

const MONTHS = [
  { value: "", label: "Full Year" },
  ...["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    .map((m, i) => ({ value: String(i + 1), label: m })),
];

const THIS_YEAR = new Date().getFullYear();

interface BvARow {
  accountId: string; code: string; name: string; type: string;
  budgeted: string; actual: string; variance: string; variancePct: string | null;
}
interface BvAResult {
  year: number; month: number | null;
  rows: BvARow[];
  totals: { budgeted: string; actual: string; variance: string };
}
interface Account { id: string; code: string; name: string; type: string }
interface BudgetLine { id: string; accountId: string; year: number; month: number | null; budgetedAmount: string; notes?: string; account: { code: string; name: string; type: string } }

// ── Variance icon ────────────────────────────────────────────────────────────

function VarianceCell({ variance, variancePct }: { variance: string; variancePct: string | null }) {
  const v = Number(variance);
  const color = v > 0 ? "text-emerald-600" : v < 0 ? "text-red-600" : "text-slate-500";
  const Icon  = v > 0 ? ChevronUp : v < 0 ? ChevronDown : Minus;
  return (
    <span className={`flex items-center justify-end gap-1 font-mono text-sm ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {naira(Math.abs(v))}
      {variancePct !== null && <span className="text-xs opacity-70">({variancePct}%)</span>}
    </span>
  );
}

// ── Budget vs Actuals report tab ─────────────────────────────────────────────

function ReportTab() {
  const [year,  setYear]  = useState(String(THIS_YEAR));
  const [month, setMonth] = useState("");

  const { data, isLoading } = useQuery<BvAResult>({
    queryKey: ["bva", year, month],
    queryFn: async () => (await api.get(`/budget/vs-actuals?year=${year}${month ? `&month=${month}` : ""}`)).data,
    enabled: Boolean(year),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Input className="w-24 h-8 text-sm" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Period</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Budgeted", value: data.totals.budgeted, color: "text-blue-600" },
              { label: "Total Actual",   value: data.totals.actual,   color: "text-slate-700" },
              { label: "Variance",       value: data.totals.variance, color: Number(data.totals.variance) >= 0 ? "text-emerald-600" : "text-red-600" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-lg font-semibold ${s.color}`}>{naira(s.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No budget lines or activity in this period.</TableCell></TableRow>
                  )}
                  {data.rows.map((r) => (
                    <TableRow key={r.accountId}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell className="text-sm">{r.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.type}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-sm">{naira(r.budgeted)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{naira(r.actual)}</TableCell>
                      <TableCell className="text-right"><VarianceCell variance={r.variance} variancePct={r.variancePct} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Budget lines management tab ──────────────────────────────────────────────

function LinesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [year,  setYear]  = useState(String(THIS_YEAR));
  const [month, setMonth] = useState("");
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState({ accountId: "", year: String(THIS_YEAR), month: "", budgetedAmount: "", notes: "" });

  const { data: lines = [], isLoading: loadingLines } = useQuery<BudgetLine[]>({
    queryKey: ["budgets", year, month],
    queryFn: async () => (await api.get(`/budget?year=${year}${month ? `&month=${month}` : ""}`)).data,
    enabled: Boolean(year),
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts-for-budget"],
    queryFn: async () => (await api.get("/accounting/accounts")).data,
  });

  const save = useMutation({
    mutationFn: (d: typeof form) => api.post("/budget", {
      accountId: d.accountId,
      year: parseInt(d.year),
      ...(d.month ? { month: parseInt(d.month) } : {}),
      budgetedAmount: parseFloat(d.budgetedAmount),
      notes: d.notes || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budgets"] }); qc.invalidateQueries({ queryKey: ["bva"] }); setOpen(false); toast({ title: "Budget line saved" }); },
    onError: () => toast({ title: "Failed to save budget line", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/budget/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budgets"] }); qc.invalidateQueries({ queryKey: ["bva"] }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const postableAccounts = accounts.filter((a: any) => a.isPostable);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Year</Label>
            <Input className="w-24 h-8 text-sm" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Period</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" onClick={() => { setForm({ accountId: "", year, month, budgetedAmount: "", notes: "" }); setOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" />Add Budget Line
        </Button>
      </div>

      {loadingLines ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Budget Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No budget lines for this period.</TableCell></TableRow>
                )}
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">{l.account.code}</TableCell>
                    <TableCell className="text-sm">{l.account.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{l.account.type}</Badge></TableCell>
                    <TableCell className="text-sm">{l.month ? MONTHS[l.month].label : "Full Year"} {l.year}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{naira(l.budgetedAmount)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(l.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
          <DialogHeader><DialogTitle>Add Budget Line</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Account</Label>
              <Select value={form.accountId} onValueChange={(v) => setForm((p) => ({ ...p, accountId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
                <SelectContent>
                  {postableAccounts.map((a: Account) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Year</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} />
              </div>
              <div>
                <Label>Month</Label>
                <Select value={form.month} onValueChange={(v) => setForm((p) => ({ ...p, month: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Budgeted Amount (₦)</Label>
              <Input type="number" min="0" step="1000" value={form.budgetedAmount}
                onChange={(e) => setForm((p) => ({ ...p, budgetedAmount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.accountId || !form.budgetedAmount || save.isPending}
              onClick={() => save.mutate(form)}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Page root ────────────────────────────────────────────────────────────────

export function BudgetPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Budget vs Actuals</h1>
          <p className="text-sm text-muted-foreground">Set targets per GL account and compare against real postings</p>
        </div>
      </div>

      <Tabs defaultValue="report">
        <TabsList>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="lines">Budget Lines</TabsTrigger>
        </TabsList>
        <TabsContent value="report" className="mt-4"><ReportTab /></TabsContent>
        <TabsContent value="lines"  className="mt-4"><LinesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
