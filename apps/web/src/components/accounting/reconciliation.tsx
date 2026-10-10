"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Landmark, Plus, Upload, Zap, CheckCircle2, XCircle, Loader2,
  ChevronRight, AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface BankAccount {
  id: string; name: string; bankName: string; accountNumber: string;
  currency: string; isActive: boolean;
  glAccount: { code: string; name: string };
}

interface StatementLine {
  id: string; valueDate: string; description: string; reference?: string;
  amount: string; lineType: "DEBIT" | "CREDIT"; isReconciled: boolean;
  reconciledAt?: string;
  matchedPayment?: { id: string; reference?: string; invoice: { invoiceNumber: string } };
}

interface GlAccount { id: string; code: string; name: string; type: string }

const AMOUNT_COLOR: Record<string, string> = {
  CREDIT: "text-green-600",
  DEBIT: "text-red-600",
};

export function Reconciliation() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [filterReconciled, setFilterReconciled] = useState<string>("unreconciled");
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // ── Bank accounts ────────────────────────────────────────────────────────
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts"],
    queryFn: () => api.get("/accounting/bank-accounts").then((r) => r.data),
  });

  // ── Statement lines ──────────────────────────────────────────────────────
  const reconciled = filterReconciled === "all" ? undefined : filterReconciled === "reconciled";
  const { data: lines = [], isLoading: loadingLines } = useQuery<StatementLine[]>({
    queryKey: ["statement-lines", selectedAccount, filterReconciled],
    queryFn: () =>
      api.get(`/accounting/bank-accounts/${selectedAccount}/statement-lines`, {
        params: reconciled !== undefined ? { reconciled } : {},
      }).then((r) => r.data),
    enabled: !!selectedAccount,
  });

  // ── Reconciliation report ────────────────────────────────────────────────
  const { data: report } = useQuery<any>({
    queryKey: ["recon-report", selectedAccount],
    queryFn: () => api.get(`/accounting/bank-accounts/${selectedAccount}/reconciliation-report`).then((r) => r.data),
    enabled: !!selectedAccount,
  });

  // ── Auto-match ───────────────────────────────────────────────────────────
  const autoMatch = useMutation({
    mutationFn: () => api.post(`/accounting/bank-accounts/${selectedAccount}/auto-match`),
    onSuccess: ({ data }) => {
      toast({ title: `Found ${data.length} match suggestion${data.length !== 1 ? "s" : ""}` });
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Auto-match failed"), variant: "destructive" }),
  });

  // ── Manual unmatch ───────────────────────────────────────────────────────
  const unmatch = useMutation({
    mutationFn: (lineId: string) => api.patch(`/accounting/statement-lines/${lineId}/unmatch`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["statement-lines"] });
      qc.invalidateQueries({ queryKey: ["recon-report"] });
      toast({ title: "Line unreconciled" });
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Failed"), variant: "destructive" }),
  });

  const currentAccount = accounts.find((a) => a.id === selectedAccount);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bank Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Match bank statement lines to payments and journal entries.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewAccount(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Bank Account
          </Button>
          {selectedAccount && (
            <>
              <Button variant="outline" onClick={() => setShowImport(true)}>
                <Upload className="mr-2 h-4 w-4" /> Import Statement
              </Button>
              <Button onClick={() => autoMatch.mutate()} disabled={autoMatch.isPending}>
                {autoMatch.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Zap className="mr-2 h-4 w-4" />}
                Auto-Match
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Account selector + summary cards */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-72">
          <Label className="text-xs text-muted-foreground mb-1 block">Bank Account</Label>
          {loadingAccounts
            ? <div className="h-9 animate-pulse rounded bg-muted" />
            : accounts.length === 0
            ? <p className="text-sm text-muted-foreground">No bank accounts yet.</p>
            : (
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-medium">{a.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{a.bankName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Show</Label>
          <Select value={filterReconciled} onValueChange={setFilterReconciled}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unreconciled">Unreconciled</SelectItem>
              <SelectItem value="reconciled">Reconciled</SelectItem>
              <SelectItem value="all">All lines</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary banner */}
      {report && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Statement Balance</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatCurrency(Number(report.statementBalance))}
              </p>
              <p className="text-xs text-muted-foreground">as of {report.asOf}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <p className="text-xs text-amber-700">Unreconciled Credits</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-amber-800">
                {report.unreconciledCreditCount} lines · {formatCurrency(Number(report.unreconciledCreditTotal))}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-xs text-red-700">Unreconciled Debits</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-red-800">
                {report.unreconciledDebitCount} lines · {formatCurrency(Number(report.unreconciledDebitTotal))}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statement lines table */}
      {selectedAccount && (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Matched To</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingLines
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 animate-pulse rounded bg-muted" /></TableCell>
                    ))}</TableRow>
                  ))
                : lines.length === 0
                ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No statement lines found.</TableCell></TableRow>
                : lines.map((line) => (
                    <TableRow key={line.id} className={line.isReconciled ? "opacity-60" : ""}>
                      <TableCell className="text-sm tabular-nums">
                        {format(new Date(line.valueDate), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{line.description}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{line.reference ?? "—"}</TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold text-sm ${AMOUNT_COLOR[line.lineType]}`}>
                        {line.lineType === "DEBIT" ? "−" : "+"}{formatCurrency(Number(line.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {line.lineType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {line.isReconciled
                          ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />Reconciled</span>
                          : <span className="flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />Pending</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {line.matchedPayment
                          ? <span className="font-mono">{line.matchedPayment.invoice.invoiceNumber}</span>
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {line.isReconciled && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Unmatch"
                            onClick={() => unmatch.mutate(line.id)}
                            disabled={unmatch.isPending}
                          >
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!selectedAccount && !loadingAccounts && accounts.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
          <Landmark className="h-10 w-10" />
          <p className="text-sm">Select a bank account to view statement lines.</p>
        </div>
      )}

      {/* New bank account dialog */}
      <NewBankAccountDialog
        open={showNewAccount}
        onClose={() => setShowNewAccount(false)}
        onCreated={() => { setShowNewAccount(false); qc.invalidateQueries({ queryKey: ["bank-accounts"] }); }}
      />

      {/* Import statement dialog */}
      {selectedAccount && (
        <ImportStatementDialog
          open={showImport}
          bankAccountId={selectedAccount}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            qc.invalidateQueries({ queryKey: ["statement-lines"] });
            qc.invalidateQueries({ queryKey: ["recon-report"] });
          }}
        />
      )}
    </div>
  );
}

// ── New Bank Account Dialog ──────────────────────────────────────────────────

function NewBankAccountDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName]       = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [glAccountId, setGlAccountId] = useState("");

  const { data: glAccounts = [] } = useQuery<GlAccount[]>({
    queryKey: ["gl-accounts-bank"],
    queryFn: () => api.get("/accounting/accounts", { params: { type: "ASSET" } }).then((r) => r.data),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => api.post("/accounting/bank-accounts", { name, bankName, accountNumber, glAccountId }),
    onSuccess: () => { toast({ title: "Bank account added" }); onCreated(); },
    onError: (e) => toast({ title: apiErrorMessage(e, "Failed"), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label>Account Name</Label><Input placeholder="GTBank Current Account" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Bank Name</Label><Input placeholder="GTBank" value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
          <div><Label>Account Number</Label><Input placeholder="0123456789" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
          <div>
            <Label>GL Account (Chart of Accounts)</Label>
            <Select value={glAccountId} onValueChange={setGlAccountId}>
              <SelectTrigger><SelectValue placeholder="Select asset account…" /></SelectTrigger>
              <SelectContent>
                {glAccounts.filter((a) => a.type === "ASSET").map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !name || !bankName || !accountNumber || !glAccountId}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Import Statement Dialog ──────────────────────────────────────────────────

function ImportStatementDialog({
  open, bankAccountId, onClose, onImported,
}: { open: boolean; bankAccountId: string; onClose: () => void; onImported: () => void }) {
  const { toast } = useToast();
  const [csv, setCsv] = useState("");
  const [parseError, setParseError] = useState("");

  const importLines = useMutation({
    mutationFn: (lines: any[]) =>
      api.post(`/accounting/bank-accounts/${bankAccountId}/statement-lines`, { lines }),
    onSuccess: ({ data }) => {
      toast({ title: `Imported ${data.imported} lines` });
      setCsv("");
      onImported();
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Import failed"), variant: "destructive" }),
  });

  const handleImport = () => {
    setParseError("");
    try {
      const rows = csv.trim().split("\n").map((row, i) => {
        const cols = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        // Expected: date, description, reference, amount, DEBIT|CREDIT
        if (cols.length < 4) throw new Error(`Row ${i + 1}: need at least date,description,amount,type`);
        const hasRef = cols.length >= 5;
        const valueDate = cols[0]!;
        const description = cols[1]!;
        const reference   = hasRef ? cols[2] : undefined;
        const rawAmount   = hasRef ? cols[3]! : cols[2]!;
        const rawType     = hasRef ? cols[4]! : cols[3]!;
        return {
          valueDate: new Date(valueDate).toISOString(),
          description,
          reference,
          amount: Math.abs(parseFloat(rawAmount)),
          lineType: rawType.trim().toUpperCase() as "DEBIT" | "CREDIT",
        };
      });
      importLines.mutate(rows);
    } catch (err: any) {
      setParseError(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Import Bank Statement</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">
            Paste CSV rows. Format: <code>date, description, [reference,] amount, DEBIT|CREDIT</code><br />
            Example: <code>2026-10-01, Salary payment, REF001, 500000, DEBIT</code>
          </p>
          <Textarea
            rows={10}
            placeholder={"2026-10-01,GTBank POS Commission,,12500,DEBIT\n2026-10-02,Patient payment INV-001,PAY123,75000,CREDIT"}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className="font-mono text-xs"
          />
          {parseError && <p className="text-xs text-red-600">{parseError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={importLines.isPending || !csv.trim()}>
            {importLines.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
