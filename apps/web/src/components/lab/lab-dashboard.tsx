"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FlaskConical, Search, Plus, Loader2, MoreHorizontal,
  CheckCircle2, Beaker, AlertTriangle, Download,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { exportToCsv } from "@/lib/csv-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { AddResultsModal } from "./add-results-modal";

interface LabOrder {
  id: string; orderNumber: string; priority: string; status: string; createdAt: string;
  sampleType?: string; clinicalInfo?: string;
  patient: { firstName: string; lastName: string; mrn: string };
  requestedBy: { firstName: string; lastName: string };
  _count: { results: number };
}

interface LabOrderDetail extends LabOrder {
  results: {
    id: string; testName: string; result: string; unit?: string;
    normalRange?: string; isAbnormal: boolean; isCritical: boolean; notes?: string;
  }[];
}

const PRIORITY_COLOR: Record<string, string> = {
  ROUTINE: "bg-gray-100 text-gray-700",
  URGENT:  "bg-amber-100 text-amber-700",
  STAT:    "bg-red-100 text-red-700",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:          "bg-gray-100 text-gray-600",
  SAMPLE_COLLECTED: "bg-blue-100 text-blue-700",
  PROCESSING:       "bg-amber-100 text-amber-700",
  RESULTED:         "bg-purple-100 text-purple-700",
  VERIFIED:         "bg-green-100 text-green-700",
  CANCELLED:        "bg-red-100 text-red-700",
};

export function LabDashboard() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<LabOrderDetail | null>(null);
  const [addResultsTarget, setAddResultsTarget] = useState<LabOrderDetail | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: LabOrder[]; meta: { total: number } }>({
    queryKey: ["lab-orders", statusFilter],
    queryFn: () =>
      api.get("/lab/orders", {
        params: { status: statusFilter === "ALL" ? undefined : statusFilter, limit: 50 },
      }).then((r) => r.data),
  });

  const loadDetail = async (id: string) => {
    const res = await api.get(`/lab/orders/${id}`);
    setSelected(res.data);
  };

  const collect = useMutation({
    mutationFn: (id: string) => api.patch(`/lab/orders/${id}/collect`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab-orders"] }); toast({ title: "Sample collected" }); setSelected(null); },
  });

  const verify = useMutation({
    mutationFn: (id: string) => api.patch(`/lab/orders/${id}/verify`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab-orders"] }); toast({ title: "Results verified" }); setSelected(null); },
  });

  const orders = (data?.data ?? []).filter((o) =>
    search
      ? `${o.patient.firstName} ${o.patient.lastName} ${o.patient.mrn} ${o.orderNumber}`.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laboratory</h1>
          <p className="text-sm text-muted-foreground">Test orders, sample tracking and results.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patient or order no…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["ALL","PENDING","SAMPLE_COLLECTED","RESULTED","VERIFIED","CANCELLED"].map((s) => (
              <SelectItem key={s} value={s}>{s === "ALL" ? "All Statuses" : s.replace("_"," ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && <span className="text-sm text-muted-foreground">{data.meta.total} orders</span>}
        <Button
          variant="outline" size="sm" className="gap-1.5"
          disabled={orders.length === 0}
          onClick={() => exportToCsv("lab-orders", orders.map((o) => ({
            "Order #": o.orderNumber,
            Patient: `${o.patient.firstName} ${o.patient.lastName}`,
            MRN: o.patient.mrn,
            Priority: o.priority,
            Status: o.status,
            "Sample Type": o.sampleType ?? "",
            "Requested By": `${o.requestedBy.firstName} ${o.requestedBy.lastName}`,
            Date: new Date(o.createdAt).toLocaleDateString(),
          })))}
        >
          <Download className="h-4 w-4" />Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tests</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-muted" /></TableCell>
                  ))}</TableRow>
                ))
              : orders.length === 0
              ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No lab orders found.</TableCell></TableRow>
              : orders.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer hover:bg-muted/40" onClick={() => loadDetail(o.id)}>
                    <TableCell className="font-mono text-sm">{o.orderNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{o.patient.firstName} {o.patient.lastName}</p>
                      <p className="text-xs text-muted-foreground">{o.patient.mrn}</p>
                    </TableCell>
                    <TableCell><Badge className={PRIORITY_COLOR[o.priority]}>{o.priority}</Badge></TableCell>
                    <TableCell><Badge className={STATUS_COLOR[o.status] ?? "bg-gray-100"}>{o.status.replace("_"," ")}</Badge></TableCell>
                    <TableCell className="text-sm">{o._count.results} test{o._count.results !== 1 ? "s" : ""}</TableCell>
                    <TableCell className="text-sm">{o.requestedBy.firstName} {o.requestedBy.lastName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(o.createdAt), "dd MMM HH:mm")}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => collect.mutate(o.id)} disabled={o.status !== "PENDING"}>
                            <Beaker className="mr-2 h-4 w-4" />Mark Sample Collected
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => { const d = await api.get(`/lab/orders/${o.id}`); setAddResultsTarget(d.data); }}
                            disabled={o.status === "PENDING" || o.status === "CANCELLED" || o.status === "VERIFIED"}
                          >
                            <FlaskConical className="mr-2 h-4 w-4" />Enter Results
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => verify.mutate(o.id)} disabled={o.status !== "RESULTED"}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />Verify Results
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {addResultsTarget && (
        <AddResultsModal
          orderId={addResultsTarget.id}
          existingTests={addResultsTarget.results.map((r) => r.testName)}
          onClose={() => setAddResultsTarget(null)}
          onSuccess={() => { setAddResultsTarget(null); qc.invalidateQueries({ queryKey: ["lab-orders"] }); }}
        />
      )}

      {/* Order Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Lab Order — {selected.orderNumber}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex gap-2">
                  <Badge className={PRIORITY_COLOR[selected.priority]}>{selected.priority}</Badge>
                  <Badge className={STATUS_COLOR[selected.status] ?? "bg-gray-100"}>{selected.status.replace("_"," ")}</Badge>
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Patient: </span>{selected.patient.firstName} {selected.patient.lastName} ({selected.patient.mrn})</p>
                  <p><span className="text-muted-foreground">Requested by: </span>{selected.requestedBy.firstName} {selected.requestedBy.lastName}</p>
                  {selected.sampleType && <p><span className="text-muted-foreground">Sample: </span>{selected.sampleType}</p>}
                  {selected.clinicalInfo && <p><span className="text-muted-foreground">Clinical info: </span>{selected.clinicalInfo}</p>}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Results</p>
                  {selected.results.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No results entered yet.</p>
                  ) : selected.results.map((r) => (
                    <div key={r.id} className={`rounded-lg border p-3 text-sm ${r.isCritical ? "border-red-300 bg-red-50" : r.isAbnormal ? "border-amber-200 bg-amber-50" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.testName}</span>
                        <div className="flex gap-1">
                          {r.isCritical && <Badge className="bg-red-100 text-red-700 text-xs">CRITICAL</Badge>}
                          {r.isAbnormal && !r.isCritical && <Badge className="bg-amber-100 text-amber-700 text-xs">ABNORMAL</Badge>}
                        </div>
                      </div>
                      <p className="mt-1 font-bold">{r.result} {r.unit}</p>
                      {r.normalRange && <p className="text-xs text-muted-foreground">Normal: {r.normalRange}</p>}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {selected.status === "PENDING" && (
                    <Button size="sm" variant="outline" onClick={() => collect.mutate(selected.id)} disabled={collect.isPending}>
                      {collect.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Collect Sample
                    </Button>
                  )}
                  {(selected.status === "SAMPLE_COLLECTED" || selected.status === "PROCESSING") && (
                    <Button size="sm" variant="outline" onClick={() => setAddResultsTarget(selected)}>
                      <FlaskConical className="mr-2 h-4 w-4" />Enter Results
                    </Button>
                  )}
                  {selected.status === "RESULTED" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setAddResultsTarget(selected)}>
                        <FlaskConical className="mr-2 h-4 w-4" />Edit Results
                      </Button>
                      <Button size="sm" onClick={() => verify.mutate(selected.id)} disabled={verify.isPending}>
                        {verify.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify Results
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
