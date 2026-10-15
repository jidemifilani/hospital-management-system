"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Banknote, Users, CheckCircle, Clock, Trash2, Calculator, GraduationCap, Pencil } from "lucide-react";
import { format } from "date-fns";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const PAY_TYPES = [
  { type: "BASIC_SALARY", label: "Basic Salary", isDeduction: false },
  { type: "HOUSING_ALLOWANCE", label: "Housing Allowance", isDeduction: false },
  { type: "TRANSPORT_ALLOWANCE", label: "Transport Allowance", isDeduction: false },
  { type: "MEDICAL_ALLOWANCE", label: "Medical Allowance", isDeduction: false },
  { type: "OVERTIME", label: "Overtime", isDeduction: false },
  { type: "BONUS", label: "Bonus", isDeduction: false },
  { type: "OTHER_ALLOWANCE", label: "Other Allowance", isDeduction: false },
  { type: "PENSION_DEDUCTION", label: "Pension", isDeduction: true },
  { type: "TAX_DEDUCTION", label: "Tax (PAYE)", isDeduction: true },
  { type: "LOAN_DEDUCTION", label: "Loan Deduction", isDeduction: true },
  { type: "OTHER_DEDUCTION", label: "Other Deduction", isDeduction: true },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PAID: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function fmt(n: any) {
  return `₦${Number(n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

type Component = { type: string; label: string; amount: string; isDeduction: boolean };

function CreatePayrollDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    staffId: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()),
    basicSalary: "", notes: "",
  });
  const [components, setComponents] = useState<Component[]>([
    { type: "BASIC_SALARY", label: "Basic Salary", amount: "", isDeduction: false },
  ]);
  const [applyNhf, setApplyNhf] = useState(true);
  const [taxPreview, setTaxPreview] = useState<any>(null);

  const addComponent = () =>
    setComponents([...components, { type: "OTHER_ALLOWANCE", label: "", amount: "", isDeduction: false }]);

  const removeComponent = (i: number) => setComponents(components.filter((_, idx) => idx !== i));

  const updateComp = (i: number, field: keyof Component, value: any) => {
    const next = [...components];
    if (field === "type") {
      const preset = PAY_TYPES.find((p) => p.type === value);
      next[i] = { ...next[i]!, type: value, label: preset?.label ?? next[i]!.label, isDeduction: preset?.isDeduction ?? false };
    } else {
      (next[i] as any)[field] = value;
    }
    setComponents(next);
    setTaxPreview(null);
  };

  const computeTax = useMutation({
    mutationFn: () => {
      const get = (type: string) =>
        components.filter((c) => c.type === type && !c.isDeduction).reduce((s, c) => s + Number(c.amount || 0), 0);
      return api.post("/payroll/compute-tax", {
        basicSalary:        get("BASIC_SALARY"),
        housingAllowance:   get("HOUSING_ALLOWANCE"),
        transportAllowance: get("TRANSPORT_ALLOWANCE"),
        medicalAllowance:   get("MEDICAL_ALLOWANCE"),
        otherAllowances:    components
          .filter((c) => !c.isDeduction && !["BASIC_SALARY","HOUSING_ALLOWANCE","TRANSPORT_ALLOWANCE","MEDICAL_ALLOWANCE"].includes(c.type))
          .reduce((s, c) => s + Number(c.amount || 0), 0),
        applyNhf,
      }).then((r) => r.data);
    },
    onSuccess: (data) => setTaxPreview(data),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/payroll", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  const allowances = components.filter((c) => !c.isDeduction && c.amount && Number(c.amount) > 0);
  const manualDeductions = components.filter((c) => c.isDeduction && c.amount && Number(c.amount) > 0);
  const grossPay = allowances.reduce((s, c) => s + Number(c.amount), 0);
  const manualDedTotal = manualDeductions.reduce((s, c) => s + Number(c.amount), 0);
  const statutoryTotal = taxPreview
    ? (taxPreview.pensionEmployee ?? 0) + (taxPreview.nhf ?? 0) + (taxPreview.payeTax ?? 0)
    : 0;
  const totalDeductions = manualDedTotal + statutoryTotal;
  const netPay = grossPay - totalDeductions;

  const handleSubmit = () => {
    const validComponents = components.filter((c) => c.amount && Number(c.amount) > 0);
    mutation.mutate({
      ...form,
      basicSalary: validComponents.find((c) => c.type === "BASIC_SALARY")?.amount ?? 0,
      components: validComponents,
      autoComputeStatutory: true,
      applyNhf,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Create Payroll</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Payroll</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Staff ID</Label>
              <Input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} placeholder="Staff ID" />
            </div>
            <div className="space-y-1">
              <Label>Month</Label>
              <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} type="number" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Allowances & Earnings</Label>
              <Button type="button" size="sm" variant="outline" onClick={addComponent}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Amount (₦)</TableHead>
                    <TableHead>Ded?</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Select value={c.type} onValueChange={(v) => updateComp(i, "type", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{PAY_TYPES.map((p) => <SelectItem key={p.type} value={p.type}>{p.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" value={c.label} onChange={(e) => updateComp(i, "label", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" type="number" value={c.amount} onChange={(e) => updateComp(i, "amount", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Badge className={c.isDeduction ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                          {c.isDeduction ? "Y" : "N"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeComponent(i)}>
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Statutory deductions panel */}
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Statutory Deductions (Auto-computed)</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch checked={applyNhf} onCheckedChange={(v) => { setApplyNhf(v); setTaxPreview(null); }} />
                  <span>Apply NHF</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => computeTax.mutate()} disabled={computeTax.isPending || grossPay === 0}>
                  <Calculator className="h-3 w-3 mr-1" />
                  {computeTax.isPending ? "Computing..." : "Compute Tax"}
                </Button>
              </div>
            </div>
            {taxPreview ? (
              <div className="text-sm space-y-1">
                <div className="flex justify-between text-muted-foreground text-xs pb-1 border-b">
                  <span>Pensionable base (basic+housing+transport)</span>
                  <span>{fmt(taxPreview.pensionableBase)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pension (employee 8%)</span>
                  <span className="text-red-600">-{fmt(taxPreview.pensionEmployee)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Pension (employer 10%) — cost only, not deducted</span>
                  <span>{fmt(taxPreview.pensionEmployer)}</span>
                </div>
                {applyNhf && (
                  <div className="flex justify-between">
                    <span>NHF (2.5% of basic)</span>
                    <span className="text-red-600">-{fmt(taxPreview.nhf)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>PAYE Tax</span>
                  <span className="text-red-600">-{fmt(taxPreview.payeTax)}</span>
                </div>
                <div className="text-xs text-muted-foreground pt-1 border-t">
                  <span>CRA (monthly equiv.) {fmt(taxPreview.craMonthly)} · Taxable income {fmt(taxPreview.taxableIncomeMonthly)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Enter allowances above, then click Compute Tax to calculate PAYE, pension and NHF.</p>
            )}
          </div>

          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Gross Pay:</span><span className="font-medium text-green-700">{fmt(grossPay)}</span></div>
            <div className="flex justify-between"><span>Manual deductions:</span><span className="text-red-600">-{fmt(manualDedTotal)}</span></div>
            <div className="flex justify-between"><span>Statutory deductions:</span><span className="text-red-600">-{fmt(statutoryTotal)}</span></div>
            <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Net Pay:</span><span>{fmt(netPay)}</span></div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <Button
            className="w-full"
            disabled={!form.staffId || mutation.isPending || grossPay === 0}
            onClick={handleSubmit}
          >
            {mutation.isPending ? "Creating..." : "Create Payroll"}
          </Button>
          {mutation.isError && <p className="text-xs text-red-600">{apiErrorMessage(mutation.error, "Something went wrong")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayrollDetailSheet({ payroll, open, onClose, onRefresh }: { payroll: any; open: boolean; onClose: () => void; onRefresh: () => void }) {
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ status, paymentMethod }: { status: string; paymentMethod?: string }) =>
      api.patch(`/payroll/${payroll.id}/status`, { status, paymentMethod }).then((r) => r.data),
    onSuccess: () => { onRefresh(); qc.invalidateQueries({ queryKey: ["payroll-summary"] }); },
  });

  if (!payroll) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Payroll — {payroll.payrollNumber}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Staff</span><span className="font-medium">{payroll.staff?.firstName} {payroll.staff?.lastName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dept</span><span>{payroll.staff?.department?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span>{MONTHS[payroll.month - 1]} {payroll.year}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span>{statusBadge(payroll.status)}</div>
            {payroll.paidAt && <div className="flex justify-between"><span className="text-muted-foreground">Paid At</span><span>{format(new Date(payroll.paidAt), "dd MMM yyyy")}</span></div>}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Pay Components</p>
            {payroll.components?.map((c: any) => (
              <div key={c.id} className="flex justify-between text-sm py-0.5 border-b last:border-0">
                <span className={c.isDeduction ? "text-red-600" : ""}>{c.label}</span>
                <span className={c.isDeduction ? "text-red-600" : "text-green-700"}>{c.isDeduction ? "-" : "+"}{fmt(c.amount)}</span>
              </div>
            ))}
            <div className="pt-2 space-y-1 text-sm font-medium">
              <div className="flex justify-between"><span>Gross Pay</span><span className="text-green-700">{fmt(payroll.grossPay)}</span></div>
              <div className="flex justify-between"><span>Total Deductions</span><span className="text-red-600">-{fmt(payroll.totalDeductions)}</span></div>
              <div className="flex justify-between text-base border-t pt-2"><span>Net Pay</span><span>{fmt(payroll.netPay)}</span></div>
            </div>
          </div>

          {/* Statutory breakdown */}
          {(Number(payroll.payeTax) > 0 || Number(payroll.pensionEmployee) > 0 || Number(payroll.nhf) > 0) && (
            <div className="rounded-md border p-3 space-y-1 text-sm">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">Statutory Breakdown</p>
              {Number(payroll.pensionEmployee) > 0 && (
                <>
                  <div className="flex justify-between">
                    <span>Pension Employee (8%)</span><span className="text-red-600">-{fmt(payroll.pensionEmployee)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Pension Employer (10%) — remit only</span><span>{fmt(payroll.pensionEmployer)}</span>
                  </div>
                </>
              )}
              {Number(payroll.nhf) > 0 && (
                <div className="flex justify-between"><span>NHF (2.5%)</span><span className="text-red-600">-{fmt(payroll.nhf)}</span></div>
              )}
              {Number(payroll.payeTax) > 0 && (
                <div className="flex justify-between"><span>PAYE Tax</span><span className="text-red-600">-{fmt(payroll.payeTax)}</span></div>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {payroll.status === "DRAFT" && (
              <>
                <Button size="sm" onClick={() => updateStatus.mutate({ status: "APPROVED" })} disabled={updateStatus.isPending}>Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ status: "CANCELLED" })} disabled={updateStatus.isPending}>Cancel</Button>
              </>
            )}
            {payroll.status === "APPROVED" && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus.mutate({ status: "PAID", paymentMethod: "BANK_TRANSFER" })} disabled={updateStatus.isPending}>Mark as Paid</Button>
                <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ status: "CANCELLED" })} disabled={updateStatus.isPending}>Cancel</Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SalaryGradesTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", basicSalary: "", housingAllowance: "", transportAllowance: "", medicalAllowance: "", otherAllowances: "" });
  const [preview, setPreview] = useState<any>(null);

  const { data: grades = [] } = useQuery({
    queryKey: ["salary-grades"],
    queryFn: () => api.get("/payroll/salary-grades").then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editing
        ? api.patch(`/payroll/salary-grades/${editing.id}`, data).then((r) => r.data)
        : api.post("/payroll/salary-grades", data).then((r) => r.data),
    onSuccess: () => { setDialogOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["salary-grades"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/payroll/salary-grades/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salary-grades"] }),
  });

  const previewMutation = useMutation({
    mutationFn: (id: string) => api.get(`/payroll/salary-grades/${id}/preview`).then((r) => r.data),
    onSuccess: (data) => setPreview(data),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", basicSalary: "", housingAllowance: "", transportAllowance: "", medicalAllowance: "", otherAllowances: "" });
    setPreview(null);
    setDialogOpen(true);
  };

  const openEdit = (g: any) => {
    setEditing(g);
    setForm({
      name: g.name, basicSalary: g.basicSalary, housingAllowance: g.housingAllowance,
      transportAllowance: g.transportAllowance, medicalAllowance: g.medicalAllowance, otherAllowances: g.otherAllowances,
    });
    setPreview(null);
    setDialogOpen(true);
  };

  const totalAllowances = (g: any) =>
    Number(g.basicSalary) + Number(g.housingAllowance) + Number(g.transportAllowance) + Number(g.medicalAllowance) + Number(g.otherAllowances);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Define standard pay scales. Use them as a reference when creating individual payrolls.</p>
        <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" />New Grade</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grade Name</TableHead>
              <TableHead>Basic</TableHead>
              <TableHead>Housing</TableHead>
              <TableHead>Transport</TableHead>
              <TableHead>Medical</TableHead>
              <TableHead>Total Gross</TableHead>
              <TableHead>Tax Preview</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(grades as any[]).length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No salary grades yet</TableCell></TableRow>
            )}
            {(grades as any[]).map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell>{fmt(g.basicSalary)}</TableCell>
                <TableCell>{fmt(g.housingAllowance)}</TableCell>
                <TableCell>{fmt(g.transportAllowance)}</TableCell>
                <TableCell>{fmt(g.medicalAllowance)}</TableCell>
                <TableCell className="font-semibold text-green-700">{fmt(totalAllowances(g))}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => previewMutation.mutate(g.id)} disabled={previewMutation.isPending}>
                    <Calculator className="h-3 w-3 mr-1" />Tax
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(g)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteMutation.mutate(g.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Tax preview panel */}
      {preview && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tax Preview — {preview.grade?.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span>Gross income</span><span className="font-medium text-green-700">{fmt(preview.tax?.grossIncome)}</span></div>
            <div className="flex justify-between"><span>Pension (employee 8%)</span><span className="text-red-600">-{fmt(preview.tax?.pensionEmployee)}</span></div>
            <div className="flex justify-between text-muted-foreground text-xs"><span>Pension (employer 10%)</span><span>{fmt(preview.tax?.pensionEmployer)}</span></div>
            <div className="flex justify-between"><span>NHF (2.5%)</span><span className="text-red-600">-{fmt(preview.tax?.nhf)}</span></div>
            <div className="flex justify-between"><span>PAYE Tax</span><span className="text-red-600">-{fmt(preview.tax?.payeTax)}</span></div>
            <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Net after statutory</span><span>{fmt(preview.tax?.netAfterStatutory)}</span></div>
            <div className="text-xs text-muted-foreground pt-1">CRA (monthly) {fmt(preview.tax?.craMonthly)} · Taxable income {fmt(preview.tax?.taxableIncomeMonthly)}</div>
          </CardContent>
        </Card>
      )}

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Salary Grade</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Grade Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            {(["basicSalary","housingAllowance","transportAllowance","medicalAllowance","otherAllowances"] as const).map((field) => (
              <div key={field} className="space-y-1">
                <Label>{field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} (₦)</Label>
                <Input type="number" value={(form as any)[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
              </div>
            ))}
            <Button className="w-full" disabled={!form.name || saveMutation.isPending} onClick={() => saveMutation.mutate(form)}>
              {saveMutation.isPending ? "Saving..." : "Save Grade"}
            </Button>
            {saveMutation.isError && <p className="text-xs text-red-600">{apiErrorMessage(saveMutation.error, "Something went wrong")}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PayrollPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(String(now.getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(now.getFullYear()));
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<any>(null);

  const { data: summary } = useQuery({
    queryKey: ["payroll-summary", monthFilter, yearFilter],
    queryFn: () => api.get("/payroll/summary", { params: { month: monthFilter, year: yearFilter } }).then((r) => r.data),
  });

  const { data: payrolls = [], refetch } = useQuery({
    queryKey: ["payrolls", monthFilter, yearFilter, statusFilter],
    queryFn: () => api.get("/payroll", { params: { month: monthFilter, year: yearFilter, ...(statusFilter !== "ALL" && { status: statusFilter }) } }).then((r) => r.data),
  });

  const invalidate = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ["payroll-summary"] });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">Staff salary management and payment tracking</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.draft ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.approved ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.paid ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Net Paid</CardTitle>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><div className="text-xl font-bold">{fmt(summary?.totalNetPaid ?? 0)}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payrolls">
        <TabsList>
          <TabsTrigger value="payrolls"><Banknote className="h-4 w-4 mr-2" />Payrolls</TabsTrigger>
          <TabsTrigger value="grades"><GraduationCap className="h-4 w-4 mr-2" />Salary Grades</TabsTrigger>
        </TabsList>

        <TabsContent value="payrolls" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="w-24" type="number" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <CreatePayrollDialog onSuccess={invalidate} />
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payroll #</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payrolls as any[]).length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payroll records found</TableCell></TableRow>
                )}
                {(payrolls as any[]).map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(p)}>
                    <TableCell className="font-mono text-xs">{p.payrollNumber}</TableCell>
                    <TableCell>{p.staff?.firstName} {p.staff?.lastName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.staff?.department?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{MONTHS[(p.month ?? 1) - 1]} {p.year}</TableCell>
                    <TableCell className="text-green-700 font-medium">{fmt(p.grossPay)}</TableCell>
                    <TableCell className="text-red-600">{fmt(p.totalDeductions)}</TableCell>
                    <TableCell className="font-semibold">{fmt(p.netPay)}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="mt-4">
          <SalaryGradesTab />
        </TabsContent>
      </Tabs>

      {selected && (
        <PayrollDetailSheet
          payroll={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onRefresh={invalidate}
        />
      )}
    </div>
  );
}
