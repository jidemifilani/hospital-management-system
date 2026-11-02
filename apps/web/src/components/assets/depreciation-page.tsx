"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingDown, Loader2, Play, Settings2, CalendarClock, CheckCircle2,
  AlertTriangle, XCircle, ArrowLeft,
} from "lucide-react";
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

const naira = (v: string | number | null | undefined) =>
  v == null ? "—" : `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const THIS = new Date();

const METHOD_LABELS: Record<string, string> = {
  STRAIGHT_LINE: "Straight line",
  DECLINING_BALANCE: "Declining balance",
};

interface RegisterRow {
  assetId: string; assetNumber: string; name: string; category: string; status: string;
  method: string | null; cost: string; salvageValue: string; accumulated: string;
  bookValue: string; periodsCharged: number; usefulLifeMonths: number | null;
  configured: boolean; fullyDepreciated: boolean;
}
interface RegisterResult {
  rows: RegisterRow[];
  totals: { cost: string; accumulated: string; bookValue: string };
}
interface ScheduleResult {
  assetNumber: string; name: string; method: string; cost: string; salvageValue: string;
  usefulLifeMonths: number; startDate: string; totalDepreciable: string;
  rows: { year: number; month: number; amount: string; accumulated: string; bookValue: string; charged: boolean }[];
}
interface RunResult {
  year: number; month: number; eligible: number; chargedCount: number; totalCharged: string;
  charged: { assetNumber: string; amount: string }[];
  skipped: { assetNumber: string; reason: string }[];
  failed: { assetNumber: string; error: string }[];
}

// ── Setup dialog ─────────────────────────────────────────────────────────────

function SetupDialog({ asset, open, onOpenChange }: { asset: RegisterRow | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    depreciationMethod: "STRAIGHT_LINE",
    usefulLifeMonths: "60",
    salvageValue: "0",
    depreciationStartDate: "",
  });

  const save = useMutation({
    mutationFn: () => api.post(`/assets/${asset!.assetId}/depreciation/setup`, {
      depreciationMethod: form.depreciationMethod,
      usefulLifeMonths: parseInt(form.usefulLifeMonths),
      salvageValue: parseFloat(form.salvageValue) || 0,
      depreciationStartDate: form.depreciationStartDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dep-register"] });
      onOpenChange(false);
      toast({ title: "Depreciation configured" });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Failed to configure", variant: "destructive" }),
  });

  const cost = Number(asset?.cost ?? 0);
  const salvage = parseFloat(form.salvageValue) || 0;
  const life = parseInt(form.usefulLifeMonths) || 0;
  const monthly = form.depreciationMethod === "STRAIGHT_LINE" && life > 0
    ? (cost - salvage) / life
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Depreciation — {asset?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Purchase cost </span>
            <span className="font-mono font-semibold">{naira(asset?.cost)}</span>
          </div>
          <div>
            <Label>Method</Label>
            <Select value={form.depreciationMethod} onValueChange={(v) => setForm((p) => ({ ...p, depreciationMethod: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Useful life (months)</Label>
              <Input type="number" min="1" value={form.usefulLifeMonths}
                onChange={(e) => setForm((p) => ({ ...p, usefulLifeMonths: e.target.value }))} />
            </div>
            <div>
              <Label>Salvage value</Label>
              <Input type="number" min="0" step="0.01" value={form.salvageValue}
                onChange={(e) => setForm((p) => ({ ...p, salvageValue: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Start date (defaults to purchase date)</Label>
            <Input type="date" value={form.depreciationStartDate}
              onChange={(e) => setForm((p) => ({ ...p, depreciationStartDate: e.target.value }))} />
          </div>

          {monthly !== null && monthly > 0 && (
            <p className="text-xs text-muted-foreground">
              Monthly charge will be <span className="font-mono font-medium">{naira(monthly)}</span> for {life} months.
            </p>
          )}
          {salvage >= cost && cost > 0 && (
            <p className="flex items-start gap-2 text-xs text-red-600">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Salvage value must be below the purchase cost.
            </p>
          )}
          {asset && asset.periodsCharged > 0 && (
            <p className="flex items-start gap-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This asset has {asset.periodsCharged} charge(s) posted already. The basis cannot be changed
              until those entries are reversed.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={save.isPending || !life || (cost > 0 && salvage >= cost) || (asset?.periodsCharged ?? 0) > 0}
            onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Schedule view ────────────────────────────────────────────────────────────

function ScheduleView({ assetId, onBack }: { assetId: string; onBack: () => void }) {
  const { data, isLoading, error } = useQuery<ScheduleResult>({
    queryKey: ["dep-schedule", assetId],
    queryFn: async () => (await api.get(`/assets/${assetId}/depreciation/schedule`)).data,
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (error) {
    return (
      <div className="space-y-3">
        <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
        <Card><CardContent className="py-6 text-sm text-muted-foreground">
          {(error as any)?.response?.data?.message ?? "Could not load the schedule."}
        </CardContent></Card>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h3 className="font-semibold">{data.name}</h3>
          <p className="text-sm text-muted-foreground">
            {data.assetNumber} · {METHOD_LABELS[data.method] ?? data.method} · {data.usefulLifeMonths} months from {data.startDate}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Cost", value: data.cost },
          { label: "Salvage Value", value: data.salvageValue },
          { label: "Total Depreciable", value: data.totalDepreciable },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-semibold">{naira(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Projected Schedule</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Charge</TableHead>
                <TableHead className="text-right">Accumulated</TableHead>
                <TableHead className="text-right">Book Value</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((r) => (
                <TableRow key={`${r.year}-${r.month}`} className={r.charged ? "bg-emerald-50/50" : ""}>
                  <TableCell className="text-sm">{MONTHS[r.month - 1]} {r.year}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{naira(r.amount)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{naira(r.accumulated)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{naira(r.bookValue)}</TableCell>
                  <TableCell>
                    {r.charged
                      ? <Badge className="bg-emerald-100 text-emerald-700">Posted</Badge>
                      : <Badge variant="secondary">Projected</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Register tab ─────────────────────────────────────────────────────────────

function RegisterTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [setupTarget, setSetupTarget] = useState<RegisterRow | null>(null);

  const { data, isLoading } = useQuery<RegisterResult>({
    queryKey: ["dep-register"],
    queryFn: async () => (await api.get("/assets/depreciation/register")).data,
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!data) return null;

  const unconfigured = data.rows.filter((r) => !r.configured).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Gross Cost", value: data.totals.cost },
          { label: "Accumulated Depreciation", value: data.totals.accumulated },
          { label: "Net Book Value", value: data.totals.bookValue },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-semibold">{naira(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {unconfigured > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-2 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {unconfigured} asset{unconfigured === 1 ? " has" : "s have"} no depreciation basis set and
              will be skipped by every run until configured.
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Accumulated</TableHead>
                <TableHead className="text-right">Book Value</TableHead>
                <TableHead className="text-right">Periods</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No assets with a purchase price recorded.
                </TableCell></TableRow>
              )}
              {data.rows.map((r) => (
                <TableRow key={r.assetId}>
                  <TableCell>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{r.assetNumber}</div>
                  </TableCell>
                  <TableCell>
                    {r.method
                      ? <Badge variant="secondary" className="text-xs">{METHOD_LABELS[r.method] ?? r.method}</Badge>
                      : <Badge className="bg-amber-100 text-amber-700 text-xs">Not set</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{naira(r.cost)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{naira(r.accumulated)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{naira(r.bookValue)}</TableCell>
                  <TableCell className="text-right text-sm">
                    {r.usefulLifeMonths ? `${r.periodsCharged}/${r.usefulLifeMonths}` : r.periodsCharged}
                    {r.fullyDepreciated && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-emerald-600" />}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.configured && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onSelect(r.assetId)}>
                          Schedule
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Configure depreciation"
                        onClick={() => setSetupTarget(r)}>
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SetupDialog asset={setupTarget} open={setupTarget !== null} onOpenChange={(v) => !v && setSetupTarget(null)} />
    </div>
  );
}

// ── Run tab ──────────────────────────────────────────────────────────────────

function RunTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [year, setYear]   = useState(String(THIS.getFullYear()));
  const [month, setMonth] = useState(String(THIS.getMonth() + 1));
  const [result, setResult] = useState<RunResult | null>(null);

  const run = useMutation({
    mutationFn: () => api.post("/assets/depreciation/run", { year: parseInt(year), month: parseInt(month) }),
    onSuccess: (res) => {
      setResult(res.data);
      qc.invalidateQueries({ queryKey: ["dep-register"] });
      qc.invalidateQueries({ queryKey: ["dep-schedule"] });
      const d: RunResult = res.data;
      toast({
        title: d.chargedCount > 0
          ? `Charged ${d.chargedCount} asset${d.chargedCount === 1 ? "" : "s"}`
          : "Nothing to charge",
        description: d.failed.length > 0 ? `${d.failed.length} failed — see details.` : undefined,
        variant: d.failed.length > 0 ? "destructive" : undefined,
      });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Run failed", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Run Monthly Depreciation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Charges every configured asset for the chosen month and posts each charge to the ledger
            (depreciation expense against accumulated depreciation). Re-running the same month is safe —
            assets already charged for it are skipped.
          </p>
          <div className="flex items-end gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Input className="h-8 w-24 text-sm" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <Button size="sm" disabled={run.isPending} onClick={() => run.mutate()}>
              {run.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
              Run
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Eligible", value: String(result.eligible) },
              { label: "Charged", value: String(result.chargedCount) },
              { label: "Skipped", value: String(result.skipped.length) },
              { label: "Failed", value: String(result.failed.length) },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Total charged for {MONTHS[result.month - 1]} {result.year}</p>
              <p className="text-xl font-semibold">{naira(result.totalCharged)}</p>
            </CardContent>
          </Card>

          {result.failed.length > 0 && (
            <Card className="border-red-300 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-700">
                  <XCircle className="h-4 w-4" />Failed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-red-700">
                {result.failed.map((f) => (
                  <div key={f.assetNumber}><span className="font-mono">{f.assetNumber}</span> — {f.error}</div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.charged.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Charged</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {result.charged.map((c) => (
                      <TableRow key={c.assetNumber}>
                        <TableCell className="font-mono text-xs">{c.assetNumber}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{naira(c.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {result.skipped.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Skipped</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {result.skipped.map((s) => (
                      <TableRow key={s.assetNumber}>
                        <TableCell className="font-mono text-xs">{s.assetNumber}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Page root ────────────────────────────────────────────────────────────────

export function DepreciationPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <TrendingDown className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Asset Depreciation</h1>
          <p className="text-sm text-muted-foreground">Register, schedules and monthly posting to the ledger</p>
        </div>
      </div>

      {selected ? (
        <ScheduleView assetId={selected} onBack={() => setSelected(null)} />
      ) : (
        <Tabs defaultValue="register">
          <TabsList>
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="run"><CalendarClock className="mr-1 h-3 w-3" />Monthly Run</TabsTrigger>
          </TabsList>
          <TabsContent value="register" className="mt-4"><RegisterTab onSelect={setSelected} /></TabsContent>
          <TabsContent value="run" className="mt-4"><RunTab /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
