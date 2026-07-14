"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search, Plus, CreditCard, TrendingUp, Clock,
  MoreHorizontal, Loader2, Receipt, Globe, Download, Printer,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { exportToCsv } from "@/lib/csv-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { RecordPaymentModal } from "./record-payment-modal";

interface Invoice {
  id: string; invoiceNumber: string; status: string;
  total: string; amountPaid: string; createdAt: string;
  patient: { firstName: string; lastName: string; mrn: string };
  payments: { amount: string; method: string; paidAt: string }[];
  _count: { items: number };
}

interface DailySummary {
  date: string; totalCollected: number; byMethod: Record<string, number>;
  invoicesRaised: number; outstandingTotal: number;
}

const STATUS_VARIANT: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ISSUED: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const NGN = (n: number | string) =>
  Number(n).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export function BillingDashboard() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [initiating, setInitiating] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const initiateOnlinePayment = async (inv: Invoice) => {
    setInitiating(inv.id);
    try {
      const { data } = await api.post(`/billing/invoices/${inv.id}/pay/initiate`);
      window.open(data.authorization_url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? "Payment initiation failed", variant: "destructive" });
    } finally {
      setInitiating(null);
    }
  };

  const { data: summary } = useQuery<DailySummary>({
    queryKey: ["billing-summary"],
    queryFn: () => api.get("/billing/invoices/daily-summary").then((r) => r.data),
  });

  const { data, isLoading } = useQuery<{ data: Invoice[]; meta: { total: number } }>({
    queryKey: ["invoices", search, statusFilter],
    queryFn: () =>
      api.get("/billing/invoices", {
        params: {
          search: search || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          limit: 50,
        },
      }).then((r) => r.data),
  });

  const invoices = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-sm text-muted-foreground">Invoices, payments and daily collections.</p>
        </div>
        <Button asChild>
          <a href="/billing/new"><Plus className="mr-2 h-4 w-4" />New Invoice</a>
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard icon={TrendingUp} label="Collected Today" value={NGN(summary.totalCollected)} color="text-green-600" />
          <SummaryCard icon={Receipt} label="Invoices Raised" value={String(summary.invoicesRaised)} color="text-blue-600" />
          <SummaryCard icon={Clock} label="Outstanding" value={NGN(summary.outstandingTotal)} color="text-amber-600" />
          <SummaryCard
            icon={CreditCard}
            label="Top Payment Method"
            value={Object.entries(summary.byMethod).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace("_", " ") ?? "—"}
            color="text-primary"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patient or invoice no…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["ALL","ISSUED","PARTIALLY_PAID","PAID","OVERDUE","CANCELLED"].map((s) => (
              <SelectItem key={s} value={s}>{s === "ALL" ? "All Statuses" : s.replace("_"," ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && <span className="text-sm text-muted-foreground">{data.meta.total} invoices</span>}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={invoices.length === 0}
          onClick={() =>
            exportToCsv("invoices", invoices.map((inv) => ({
              "Invoice #": inv.invoiceNumber,
              Patient: `${inv.patient.firstName} ${inv.patient.lastName}`,
              MRN: inv.patient.mrn,
              Status: inv.status,
              Total: Number(inv.total).toFixed(2),
              Paid: Number(inv.amountPaid).toFixed(2),
              Balance: (Number(inv.total) - Number(inv.amountPaid)).toFixed(2),
              Date: new Date(inv.createdAt).toLocaleDateString(),
            })))
          }
        >
          <Download className="h-4 w-4" />Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 animate-pulse rounded bg-muted" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : invoices.length === 0
              ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No invoices found.</TableCell></TableRow>
              : invoices.map((inv) => {
                  const balance = Number(inv.total) - Number(inv.amountPaid);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{inv.patient.firstName} {inv.patient.lastName}</p>
                        <p className="text-xs text-muted-foreground">{inv.patient.mrn}</p>
                      </TableCell>
                      <TableCell><Badge className={STATUS_VARIANT[inv.status] ?? "bg-gray-100"}>{inv.status.replace("_"," ")}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{NGN(inv.total)}</TableCell>
                      <TableCell className="text-right text-green-600">{NGN(inv.amountPaid)}</TableCell>
                      <TableCell className="text-right text-amber-600">{NGN(balance)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(`/print/invoice/${inv.id}`, "_blank", "width=800,height=900")}>
                              <Printer className="mr-2 h-4 w-4" />Print Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPaymentTarget(inv)} disabled={inv.status === "PAID" || inv.status === "CANCELLED"}>
                              <CreditCard className="mr-2 h-4 w-4" />Record Payment
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => initiateOnlinePayment(inv)}
                              disabled={inv.status === "PAID" || inv.status === "CANCELLED" || initiating === inv.id}
                            >
                              {initiating === inv.id
                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                : <Globe className="mr-2 h-4 w-4" />}
                              Pay Online (Paystack)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {paymentTarget && (
        <RecordPaymentModal
          invoice={paymentTarget}
          onClose={() => setPaymentTarget(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
