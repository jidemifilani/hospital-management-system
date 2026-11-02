"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, Scale, CheckCircle2, AlertTriangle, DollarSign, Plus, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const naira = (v: string | number) =>
  `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function BalancedBadge({ balanced }: { balanced: boolean }) {
  return balanced ? (
    <Badge className="bg-emerald-100 text-emerald-700">
      <CheckCircle2 className="mr-1 h-3 w-3" /> Balanced
    </Badge>
  ) : (
    <Badge className="bg-red-100 text-red-700">
      <AlertTriangle className="mr-1 h-3 w-3" /> Out of balance
    </Badge>
  );
}

function TrialBalance() {
  const { data, isLoading } = useQuery({
    queryKey: ["acc-trial"],
    queryFn: async () => (await api.get("/accounting/trial-balance")).data,
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Trial Balance
        </CardTitle>
        <BalancedBadge balanced={Boolean(data?.balanced)} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.rows ?? []).map((r: any) => (
              <TableRow key={r.accountId}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell className="text-sm">{r.name}</TableCell>
                <TableCell className="text-right text-sm">
                  {Number(r.debit) ? naira(r.debit) : "—"}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {Number(r.credit) ? naira(r.credit) : "—"}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 font-semibold">
              <TableCell colSpan={2}>Totals</TableCell>
              <TableCell className="text-right">{naira(data?.totals?.debit ?? 0)}</TableCell>
              <TableCell className="text-right">{naira(data?.totals?.credit ?? 0)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProfitAndLoss() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["acc-pl", from, to],
    queryFn: async () =>
      (await api.get("/accounting/profit-and-loss", {
        params: { from: from || "2000-01-01", to: to || undefined },
      })).data,
  });

  const net = Number(data?.totals?.netProfit ?? 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Profit &amp; Loss</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label htmlFor="pl-from" className="text-xs">From</Label>
            <Input id="pl-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pl-to" className="text-xs">To</Label>
            <Input id="pl-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableBody>
              <TableRow><TableCell colSpan={2} className="font-semibold">Income</TableCell></TableRow>
              {(data?.income ?? []).map((r: any) => (
                <TableRow key={r.code}>
                  <TableCell className="pl-6 text-sm">{r.name}</TableCell>
                  <TableCell className="text-right text-sm">{naira(r.balance)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="pl-6 text-sm font-medium">Total income</TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {naira(data?.totals?.income ?? 0)}
                </TableCell>
              </TableRow>

              <TableRow><TableCell colSpan={2} className="pt-6 font-semibold">Expenses</TableCell></TableRow>
              {(data?.expense ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="pl-6 text-sm text-muted-foreground">
                    Nothing recorded for this period.
                  </TableCell>
                </TableRow>
              )}
              {(data?.expense ?? []).map((r: any) => (
                <TableRow key={r.code}>
                  <TableCell className="pl-6 text-sm">{r.name}</TableCell>
                  <TableCell className="text-right text-sm">{naira(r.balance)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="pl-6 text-sm font-medium">Total expenses</TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {naira(data?.totals?.expense ?? 0)}
                </TableCell>
              </TableRow>

              <TableRow className="border-t-2">
                <TableCell className="text-base font-bold">
                  {net >= 0 ? "Net profit" : "Net loss"}
                </TableCell>
                <TableCell
                  className={`text-right text-base font-bold ${
                    net >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {naira(Math.abs(net))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function BalanceSheet() {
  const { data, isLoading } = useQuery({
    queryKey: ["acc-bs"],
    queryFn: async () => (await api.get("/accounting/balance-sheet")).data,
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const section = (title: string, rows: any[]) => (
    <>
      <TableRow><TableCell colSpan={2} className="pt-4 font-semibold">{title}</TableCell></TableRow>
      {rows.length === 0 && (
        <TableRow>
          <TableCell colSpan={2} className="pl-6 text-sm text-muted-foreground">None</TableCell>
        </TableRow>
      )}
      {rows.map((r: any) => (
        <TableRow key={r.code}>
          <TableCell className="pl-6 text-sm">{r.name}</TableCell>
          <TableCell className="text-right text-sm">{naira(r.balance)}</TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Balance Sheet</CardTitle>
        <BalancedBadge balanced={Boolean(data?.balanced)} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {section("Assets", data?.assets ?? [])}
            <TableRow className="border-t">
              <TableCell className="pl-6 font-medium">Total assets</TableCell>
              <TableCell className="text-right font-medium">{naira(data?.totals?.assets ?? 0)}</TableCell>
            </TableRow>

            {section("Liabilities", data?.liabilities ?? [])}
            {section("Equity", data?.equity ?? [])}
            <TableRow>
              <TableCell className="pl-6 text-sm">Retained earnings</TableCell>
              <TableCell className="text-right text-sm">{naira(data?.retainedEarnings ?? 0)}</TableCell>
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="font-bold">Liabilities and equity</TableCell>
              <TableCell className="text-right font-bold">
                {naira(data?.totals?.liabilitiesAndEquity ?? 0)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Ageing({ kind }: { kind: "AR" | "AP" }) {
  const { data, isLoading } = useQuery({
    queryKey: ["acc-aging", kind],
    queryFn: async () => (await api.get(`/accounting/aging/${kind}`)).data,
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {kind === "AR" ? "Owed to the hospital" : "Owed by the hospital"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{kind === "AR" ? "Patient" : "Supplier"}</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">31–60d</TableHead>
              <TableHead className="text-right">61–90d</TableHead>
              <TableHead className="text-right">90d+</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.rows ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nothing outstanding.
                </TableCell>
              </TableRow>
            )}
            {(data?.rows ?? []).map((r: any) => (
              <TableRow key={r.partnerId}>
                <TableCell className="text-sm">
                  {r.partnerId === "UNATTRIBUTED" || r.partnerId === "UNSPECIFIED" ? (
                    <span className="italic text-muted-foreground">{r.partnerName}</span>
                  ) : (
                    r.partnerName
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">{naira(r.current)}</TableCell>
                <TableCell className="text-right text-sm">{naira(r.d31_60)}</TableCell>
                <TableCell className="text-right text-sm">{naira(r.d61_90)}</TableCell>
                <TableCell className="text-right text-sm text-red-600">{naira(r.d90_plus)}</TableCell>
                <TableCell className="text-right text-sm font-medium">{naira(r.total)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{naira(data?.totals?.current ?? 0)}</TableCell>
              <TableCell className="text-right">{naira(data?.totals?.d31_60 ?? 0)}</TableCell>
              <TableCell className="text-right">{naira(data?.totals?.d61_90 ?? 0)}</TableCell>
              <TableCell className="text-right">{naira(data?.totals?.d90_plus ?? 0)}</TableCell>
              <TableCell className="text-right">{naira(data?.totals?.total ?? 0)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface CashFlowLine { code: string; name: string; amount: string }
interface CashFlowSection { total: string; lines: CashFlowLine[] }
interface CashFlowResult {
  from: string; to: string;
  openingCash: string; closingCash: string; netChange: string;
  sections: { operating: CashFlowSection; investing: CashFlowSection; financing: CashFlowSection };
  reconciled: boolean; unexplained?: string; note?: string;
}

function CashFlow() {
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
  const [to,   setTo]   = useState(now.toISOString().split("T")[0]);

  const { data, isLoading } = useQuery<CashFlowResult>({
    queryKey: ["acc-cashflow", from, to],
    queryFn: async () => (await api.get(`/accounting/cash-flow?from=${from}&to=${to}`)).data,
  });

  const SECTIONS = [
    { key: "operating" as const, label: "Operating Activities", hint: "Revenue, expenses and working capital" },
    { key: "investing" as const, label: "Investing Activities", hint: "Fixed asset purchases and disposals" },
    { key: "financing" as const, label: "Financing Activities", hint: "Capital introduced and withdrawn" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input className="h-8 w-40 text-sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input className="h-8 w-40 text-sm" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      {data && (
        <>
          {data.note && (
            <Card><CardContent className="py-4 text-sm text-muted-foreground">{data.note}</CardContent></Card>
          )}

          {!data.reconciled && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="flex items-start gap-2 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  The sections do not fully explain the movement in cash
                  ({naira(data.unexplained ?? 0)} unaccounted for). Treat these figures as provisional.
                </span>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Opening Cash", value: data.openingCash, color: "text-slate-700" },
              { label: "Net Change",   value: data.netChange,   color: Number(data.netChange) >= 0 ? "text-emerald-600" : "text-red-600" },
              { label: "Closing Cash", value: data.closingCash, color: "text-slate-900" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-lg font-semibold ${s.color}`}>{naira(s.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {SECTIONS.map(({ key, label, hint }) => {
            const section = data.sections[key];
            return (
              <Card key={key}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium">{label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                  <span className={`font-mono text-sm font-semibold ${Number(section.total) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {naira(section.total)}
                  </span>
                </CardHeader>
                <CardContent className="pt-0">
                  {section.lines.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">No activity in this period.</p>
                  ) : (
                    <Table>
                      <TableBody>
                        {section.lines.map((l) => (
                          <TableRow key={l.code}>
                            <TableCell className="w-20 font-mono text-xs">{l.code}</TableCell>
                            <TableCell className="text-sm">{l.name}</TableCell>
                            <TableCell className={`text-right font-mono text-sm ${Number(l.amount) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {naira(l.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

interface Currency { code: string; name: string; symbol: string; isActive: boolean }
interface ExchangeRate { id: string; currencyCode: string; rateToBase: string; effectiveDate: string; source: string; currency: { name: string; symbol: string } }

function FxRatesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ currencyCode: "", rateToBase: "", effectiveDate: new Date().toISOString().split("T")[0] });

  const { data: currencies = [], isLoading: loadingCurr } = useQuery<Currency[]>({
    queryKey: ["currencies"],
    queryFn: async () => (await api.get("/accounting/currencies")).data,
  });
  const { data: rates = [], isLoading: loadingRates } = useQuery<ExchangeRate[]>({
    queryKey: ["fx-rates"],
    queryFn: async () => (await api.get("/accounting/exchange-rates")).data,
  });

  const addRate = useMutation({
    mutationFn: (d: typeof form) => api.post("/accounting/exchange-rates", { ...d, rateToBase: parseFloat(d.rateToBase) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fx-rates"] }); setOpen(false); toast({ title: "Rate saved" }); },
    onError: () => toast({ title: "Failed to save rate", variant: "destructive" }),
  });

  const delRate = useMutation({
    mutationFn: (id: string) => api.delete(`/accounting/exchange-rates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fx-rates"] }),
    onError: () => toast({ title: "Failed to delete rate", variant: "destructive" }),
  });

  const activeCurrencies = currencies.filter((c) => c.isActive && c.code !== "NGN");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Exchange rates against the organisation base currency. Most recent rate per currency is used for conversions.</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Add Rate</Button>
      </div>

      {(loadingCurr || loadingRates) ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Rate to Base (NGN)</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No rates recorded yet.</TableCell></TableRow>
                )}
                {rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.currency.name}</TableCell>
                    <TableCell><Badge variant="outline">{r.currencyCode}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">{Number(r.rateToBase).toFixed(4)}</TableCell>
                    <TableCell className="text-sm">{r.effectiveDate.split("T")[0]}</TableCell>
                    <TableCell><Badge variant={r.source === "MANUAL" ? "secondary" : "default"}>{r.source}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => delRate.mutate(r.id)}>
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
          <DialogHeader><DialogTitle>Add Exchange Rate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Currency</Label>
              <Select value={form.currencyCode} onValueChange={(v) => setForm((p) => ({ ...p, currencyCode: v }))}>
                <SelectTrigger><SelectValue placeholder="Select currency…" /></SelectTrigger>
                <SelectContent>
                  {activeCurrencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rate to Base (1 {form.currencyCode || "foreign"} = ? NGN)</Label>
              <Input type="number" step="0.0001" min="0" value={form.rateToBase}
                onChange={(e) => setForm((p) => ({ ...p, rateToBase: e.target.value }))} placeholder="e.g. 1650" />
            </div>
            <div>
              <Label>Effective Date</Label>
              <Input type="date" value={form.effectiveDate}
                onChange={(e) => setForm((p) => ({ ...p, effectiveDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.currencyCode || !form.rateToBase || addRate.isPending}
              onClick={() => addRate.mutate(form)}>
              {addRate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AccountingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // `isLoading` matters here, not just the data. Falling back to an empty
  // array and testing its length told a hospital with a full ledger that it
  // had "no chart of accounts yet", and offered to install one, for as long as
  // the request was in flight.
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["acc-accounts"],
    queryFn: async () => (await api.get("/accounting/accounts")).data,
  });
  const hasNoChart = !accountsLoading && accounts.length === 0;

  const seed = useMutation({
    mutationFn: () => api.post("/accounting/accounts/seed-default", {}),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["acc-accounts"] });
      toast({
        title: "Chart of accounts installed",
        description: `${res.data.created} created, ${res.data.total - res.data.created} already present`,
      });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpen className="h-6 w-6" /> Accounting
          </h1>
          <p className="text-sm text-muted-foreground">
            The general ledger behind billing, stock and the till.
          </p>
        </div>
        {hasNoChart && (
          <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
            {seed.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Scale className="mr-2 h-4 w-4" /> Install Chart of Accounts
          </Button>
        )}
      </div>

      {accountsLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : hasNoChart ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Scale className="h-10 w-10 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              No chart of accounts yet. Install the default Nigerian hospital chart to start
              recording, or add accounts of your own.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="trial">
          <TabsList>
            <TabsTrigger value="trial">Trial Balance</TabsTrigger>
            <TabsTrigger value="pl">Profit &amp; Loss</TabsTrigger>
            <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cf">Cash Flow</TabsTrigger>
            <TabsTrigger value="ar">Receivables</TabsTrigger>
            <TabsTrigger value="ap">Payables</TabsTrigger>
            <TabsTrigger value="fx"><DollarSign className="mr-1 h-3 w-3" />FX Rates</TabsTrigger>
          </TabsList>
          <TabsContent value="trial" className="mt-4"><TrialBalance /></TabsContent>
          <TabsContent value="pl" className="mt-4"><ProfitAndLoss /></TabsContent>
          <TabsContent value="bs" className="mt-4"><BalanceSheet /></TabsContent>
          <TabsContent value="cf" className="mt-4"><CashFlow /></TabsContent>
          <TabsContent value="ar" className="mt-4"><Ageing kind="AR" /></TabsContent>
          <TabsContent value="ap" className="mt-4"><Ageing kind="AP" /></TabsContent>
          <TabsContent value="fx" className="mt-4"><FxRatesTab /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
