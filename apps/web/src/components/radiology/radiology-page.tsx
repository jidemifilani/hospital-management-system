"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search, Plus, ScanLine, Clock, CheckCircle2, Loader2,
  MoreHorizontal, ChevronRight, Download,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface RadiologyOrder {
  id: string; orderNumber: string; modality: string; bodyPart: string;
  priority: string; status: string; clinicalInfo?: string; scheduledAt?: string;
  performedAt?: string; createdAt: string;
  patient: { id: string; firstName: string; lastName: string; mrn: string };
  requestedBy: { firstName: string; lastName: string };
  result?: { id: string } | null;
}

const MODALITIES = [
  "XRAY", "CT_SCAN", "MRI", "ULTRASOUND", "MAMMOGRAPHY",
  "FLUOROSCOPY", "NUCLEAR_MEDICINE", "PET_SCAN", "ECHOCARDIOGRAPHY",
];

const MODALITY_LABEL: Record<string, string> = {
  XRAY: "X-Ray", CT_SCAN: "CT Scan", MRI: "MRI", ULTRASOUND: "Ultrasound",
  MAMMOGRAPHY: "Mammography", FLUOROSCOPY: "Fluoroscopy",
  NUCLEAR_MEDICINE: "Nuclear Medicine", PET_SCAN: "PET Scan", ECHOCARDIOGRAPHY: "Echocardiography",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

// ── Add Order Dialog ──────────────────────────────────────────────────────────
function AddOrderDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    patientSearch: "", patientId: "", patientName: "",
    modality: "", bodyPart: "", priority: "ROUTINE", clinicalInfo: "",
  });
  const [step, setStep] = useState<"patient" | "details">("patient");
  const { toast } = useToast();

  const { data: patientResults = [] } = useQuery({
    queryKey: ["patient-search-rad", form.patientSearch],
    queryFn: () => api.get("/patients", { params: { search: form.patientSearch, limit: 6 } }).then((r) => r.data.data ?? []),
    enabled: form.patientSearch.length >= 2,
  });

  const createOrder = useMutation({
    mutationFn: (data: any) => api.post("/radiology/orders", data),
    onSuccess: () => {
      toast({ title: "Imaging order created" });
      setForm({ patientSearch: "", patientId: "", patientName: "", modality: "", bodyPart: "", priority: "ROUTINE", clinicalInfo: "" });
      setStep("patient");
      onSuccess();
      onClose();
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Failed", variant: "destructive" }),
  });

  function submit() {
    if (!form.patientId || !form.modality || !form.bodyPart) {
      toast({ title: "Patient, modality and body part are required", variant: "destructive" });
      return;
    }
    createOrder.mutate({ patientId: form.patientId, modality: form.modality, bodyPart: form.bodyPart, priority: form.priority, clinicalInfo: form.clinicalInfo });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Imaging Order</DialogTitle></DialogHeader>
        {step === "patient" ? (
          <div className="space-y-4">
            <div>
              <Label>Search Patient</Label>
              <Input
                placeholder="Name or MRN…"
                value={form.patientSearch}
                onChange={(e) => setForm((f) => ({ ...f, patientSearch: e.target.value }))}
                className="mt-1"
              />
            </div>
            {form.patientId && (
              <p className="text-sm text-green-700 bg-green-50 rounded p-2">Selected: <strong>{form.patientName}</strong></p>
            )}
            {patientResults.length > 0 && !form.patientId && (
              <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                {patientResults.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent text-left text-sm"
                    onClick={() => { setForm((f) => ({ ...f, patientId: p.id, patientName: `${p.firstName} ${p.lastName}`, patientSearch: `${p.firstName} ${p.lastName}` })); }}
                  >
                    <span>{p.firstName} {p.lastName}</span>
                    <span className="text-muted-foreground">{p.mrn}</span>
                  </button>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button disabled={!form.patientId} onClick={() => setStep("details")}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Modality</Label>
              <Select value={form.modality} onValueChange={(v) => setForm((f) => ({ ...f, modality: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select modality…" /></SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((m) => <SelectItem key={m} value={m}>{MODALITY_LABEL[m]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Body Part / Region</Label>
              <Input
                placeholder="e.g. Chest, Left knee, Abdomen…"
                value={form.bodyPart}
                onChange={(e) => setForm((f) => ({ ...f, bodyPart: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ROUTINE", "URGENT", "STAT"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clinical Information</Label>
              <Textarea
                placeholder="Reason for imaging, relevant history…"
                value={form.clinicalInfo}
                onChange={(e) => setForm((f) => ({ ...f, clinicalInfo: e.target.value }))}
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("patient")}>Back</Button>
              <Button onClick={submit} disabled={createOrder.isPending}>
                {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Order
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Report Dialog ─────────────────────────────────────────────────────────────
function ReportDialog({ order, onClose, onSuccess }: { order: RadiologyOrder; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ findings: "", impression: "", recommendations: "" });
  const { toast } = useToast();

  const submit = useMutation({
    mutationFn: () => api.patch(`/radiology/orders/${order.id}/result`, form),
    onSuccess: () => { toast({ title: "Report saved" }); onSuccess(); onClose(); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? "Failed", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Radiology Report — {order.orderNumber}</DialogTitle>
          <p className="text-sm text-muted-foreground">{MODALITY_LABEL[order.modality]} · {order.bodyPart} · {order.patient.firstName} {order.patient.lastName}</p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Findings</Label>
            <Textarea
              placeholder="Describe what was observed…"
              value={form.findings}
              onChange={(e) => setForm((f) => ({ ...f, findings: e.target.value }))}
              className="mt-1 resize-none"
              rows={4}
            />
          </div>
          <div>
            <Label>Impression / Conclusion</Label>
            <Textarea
              placeholder="Overall clinical impression…"
              value={form.impression}
              onChange={(e) => setForm((f) => ({ ...f, impression: e.target.value }))}
              className="mt-1 resize-none"
              rows={3}
            />
          </div>
          <div>
            <Label>Recommendations</Label>
            <Textarea
              placeholder="Follow-up, additional imaging, clinical actions…"
              value={form.recommendations}
              onChange={(e) => setForm((f) => ({ ...f, recommendations: e.target.value }))}
              className="mt-1 resize-none"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || !form.findings || !form.impression}>
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function RadiologyPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalityFilter, setModalityFilter] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [reportTarget, setReportTarget] = useState<RadiologyOrder | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: summary } = useQuery({
    queryKey: ["radiology-summary"],
    queryFn: () => api.get("/radiology/summary").then((r) => r.data),
  });

  const { data, isLoading } = useQuery<{ data: RadiologyOrder[]; total: number }>({
    queryKey: ["radiology-orders", search, statusFilter, modalityFilter],
    queryFn: () =>
      api.get("/radiology/orders", {
        params: {
          search: search || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          modality: modalityFilter === "ALL" ? undefined : modalityFilter,
          limit: 50,
        },
      }).then((r) => r.data),
  });

  const orders = data?.data ?? [];

  const mutate = (url: string, successMsg: string) =>
    api.patch(url).then(() => {
      toast({ title: successMsg });
      qc.invalidateQueries({ queryKey: ["radiology-orders"] });
      qc.invalidateQueries({ queryKey: ["radiology-summary"] });
    }).catch((e: any) => toast({ title: e?.response?.data?.message ?? "Failed", variant: "destructive" }));

  const pending = summary?.byStatus?.find((s: any) => s.status === "PENDING")?._count?.id ?? 0;
  const inProgress = summary?.byStatus?.find((s: any) => s.status === "IN_PROGRESS")?._count?.id ?? 0;
  const completedToday = summary?.completedToday ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Radiology</h1>
          <p className="text-sm text-muted-foreground">Imaging orders and reports.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />New Order
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold">{inProgress}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed Today</p>
              <p className="text-2xl font-bold">{completedToday}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patient or order no…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["ALL", "PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
              <SelectItem key={s} value={s}>{s === "ALL" ? "All Statuses" : s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modalityFilter} onValueChange={setModalityFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Modalities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Modalities</SelectItem>
            {MODALITIES.map((m) => <SelectItem key={m} value={m}>{MODALITY_LABEL[m]}</SelectItem>)}
          </SelectContent>
        </Select>
        {data && <span className="text-sm text-muted-foreground">{data.total} orders</span>}
        <Button
          variant="outline" size="sm" className="gap-1.5"
          disabled={orders.length === 0}
          onClick={() => exportToCsv("radiology-orders", orders.map((o) => ({
            "Order #": o.orderNumber,
            Patient: `${o.patient.firstName} ${o.patient.lastName}`,
            MRN: o.patient.mrn,
            Modality: MODALITY_LABEL[o.modality] ?? o.modality,
            "Body Part": o.bodyPart,
            Priority: o.priority,
            Status: o.status,
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
              <TableHead>Modality</TableHead>
              <TableHead>Body Part</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
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
              : orders.length === 0
              ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No orders found.</TableCell></TableRow>
              : orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{order.patient.firstName} {order.patient.lastName}</p>
                      <p className="text-xs text-muted-foreground">{order.patient.mrn}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{MODALITY_LABEL[order.modality] ?? order.modality}</span>
                    </TableCell>
                    <TableCell className="text-sm">{order.bodyPart}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={order.priority === "STAT" ? "border-red-300 text-red-700" : order.priority === "URGENT" ? "border-amber-300 text-amber-700" : ""}>
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLOR[order.status] ?? "bg-gray-100"}>
                        {order.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(order.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {order.status === "PENDING" && (
                            <DropdownMenuItem onClick={() => mutate(`/radiology/orders/${order.id}/start`, "Scan started")}>
                              Start Scan
                            </DropdownMenuItem>
                          )}
                          {order.status === "IN_PROGRESS" && !order.result && (
                            <DropdownMenuItem onClick={() => setReportTarget(order)}>
                              Add Report
                            </DropdownMenuItem>
                          )}
                          {order.status === "COMPLETED" && order.result && (
                            <DropdownMenuItem onClick={() => mutate(`/radiology/orders/${order.id}/verify`, "Report verified")}>
                              Verify Report
                            </DropdownMenuItem>
                          )}
                          {!["COMPLETED", "CANCELLED"].includes(order.status) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => mutate(`/radiology/orders/${order.id}/cancel`, "Order cancelled")}
                            >
                              Cancel Order
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <AddOrderDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["radiology-orders"] });
          qc.invalidateQueries({ queryKey: ["radiology-summary"] });
        }}
      />

      {reportTarget && (
        <ReportDialog
          order={reportTarget}
          onClose={() => setReportTarget(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["radiology-orders"] });
            qc.invalidateQueries({ queryKey: ["radiology-summary"] });
          }}
        />
      )}
    </div>
  );
}
