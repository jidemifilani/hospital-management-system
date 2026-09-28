"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, Scale, CheckCircle2, AlertTriangle } from "lucide-react";
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

export function AccountingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ["acc-accounts"],
    queryFn: async () => (await api.get("/accounting/accounts")).data,
  });

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
        {accounts.length === 0 && (
          <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
            {seed.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Scale className="mr-2 h-4 w-4" /> Install Chart of Accounts
          </Button>
        )}
      </div>

      {accounts.length === 0 ? (
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
            <TabsTrigger value="ar">Receivables</TabsTrigger>
            <TabsTrigger value="ap">Payables</TabsTrigger>
          </TabsList>
          <TabsContent value="trial" className="mt-4"><TrialBalance /></TabsContent>
          <TabsContent value="pl" className="mt-4"><ProfitAndLoss /></TabsContent>
          <TabsContent value="bs" className="mt-4"><BalanceSheet /></TabsContent>
          <TabsContent value="ar" className="mt-4"><Ageing kind="AR" /></TabsContent>
          <TabsContent value="ap" className="mt-4"><Ageing kind="AP" /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
