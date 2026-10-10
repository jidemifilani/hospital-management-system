"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, Mail, Download, Loader2, AlertCircle, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { exportToCsv } from "@/lib/csv-export";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Bucket = "all" | "current" | "d31_60" | "d61_90" | "d90_plus";

const BUCKET_LABELS: Record<string, string> = {
  current:  "1–30 days",
  d31_60:   "31–60 days",
  d61_90:   "61–90 days",
  d90_plus: "90+ days",
};

const BUCKET_COLOURS: Record<string, string> = {
  current:  "bg-yellow-100 text-yellow-800",
  d31_60:   "bg-orange-100 text-orange-800",
  d61_90:   "bg-red-100    text-red-700",
  d90_plus: "bg-red-200    text-red-900 font-semibold",
};

interface WorklistRow {
  invoiceId:     string;
  invoiceNumber: string;
  patientId:     string;
  patientName:   string;
  mrn:           string;
  phone:         string | null;
  email:         string | null;
  outstanding:   string;
  dueDate:       string;
  daysOverdue:   number;
  bucket:        string;
}

export function DebtWorklist() {
  const [search, setSearch]   = useState("");
  const [bucket, setBucket]   = useState<Bucket>("all");

  const { data = [], isLoading, isError } = useQuery<WorklistRow[]>({
    queryKey: ["debt-worklist"],
    queryFn:  async () => (await api.get("/billing/debt-worklist")).data,
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    let list = data;
    if (bucket !== "all") list = list.filter((r) => r.bucket === bucket);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.patientName.toLowerCase().includes(q) ||
          r.mrn.toLowerCase().includes(q) ||
          r.invoiceNumber.toLowerCase().includes(q) ||
          (r.phone ?? "").includes(q),
      );
    }
    return list;
  }, [data, bucket, search]);

  const totals = useMemo(() => {
    const byBucket: Record<string, number> = {
      current: 0, d31_60: 0, d61_90: 0, d90_plus: 0,
    };
    let grand = 0;
    for (const r of data) {
      const amt = Number(r.outstanding);
      byBucket[r.bucket] = (byBucket[r.bucket] ?? 0) + amt;
      grand += amt;
    }
    return { byBucket, grand };
  }, [data]);

  function exportCsv() {
    exportToCsv(
      "debt-worklist",
      rows.map((r) => ({
        Invoice:        r.invoiceNumber,
        Patient:        r.patientName,
        MRN:            r.mrn,
        Phone:          r.phone ?? "",
        Email:          r.email ?? "",
        "Due Date":     r.dueDate,
        "Days Overdue": r.daysOverdue,
        Bucket:         BUCKET_LABELS[r.bucket] ?? r.bucket,
        Outstanding:    Number(r.outstanding).toFixed(2),
      })),
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debt Worklist</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overdue invoices ranked oldest first — {data.length} outstanding
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Age-bucket summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(["current", "d31_60", "d61_90", "d90_plus"] as const).map((b) => (
          <Card
            key={b}
            className={`cursor-pointer transition-shadow hover:shadow-md ${bucket === b ? "ring-2 ring-primary" : ""}`}
            onClick={() => setBucket(bucket === b ? "all" : b)}
          >
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {BUCKET_LABELS[b]}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold">
                {formatCurrency(totals.byBucket[b] ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.filter((r) => r.bucket === b).length} invoices
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Patient name, MRN, invoice…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={bucket} onValueChange={(v) => setBucket(v as Bucket)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ages</SelectItem>
            {(["current", "d31_60", "d61_90", "d90_plus"] as const).map((b) => (
              <SelectItem key={b} value={b}>{BUCKET_LABELS[b]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isError && (
            <div className="flex items-center gap-2 px-6 py-10 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Could not load the worklist. Try refreshing.
            </div>
          )}
          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                      {data.length === 0
                        ? "No overdue invoices — the books are clean."
                        : "No invoices match the current filter."}
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.invoiceId}>
                    <TableCell className="font-mono text-xs">{r.invoiceNumber}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{r.patientName}</p>
                      <p className="text-xs text-muted-foreground">{r.mrn}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs">
                        {r.phone && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            {r.phone}
                          </span>
                        )}
                        {r.email && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            {r.email}
                          </span>
                        )}
                        {!r.phone && !r.email && (
                          <span className="italic text-muted-foreground">No contact</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{r.dueDate}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${BUCKET_COLOURS[r.bucket] ?? ""}`}
                      >
                        {r.daysOverdue}d overdue
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatCurrency(Number(r.outstanding))}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length > 0 && (
                  <TableRow className="border-t-2 bg-muted/30 font-semibold">
                    <TableCell colSpan={5} className="text-sm">
                      Showing {rows.length} of {data.length}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCurrency(rows.reduce((s, r) => s + Number(r.outstanding), 0))}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
