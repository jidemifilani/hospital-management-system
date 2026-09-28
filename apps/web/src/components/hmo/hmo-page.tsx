"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldPlus, Loader2, Plus, Building2, UserPlus, FileText, CheckCircle2,
  AlertTriangle, Banknote, Send,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const naira = (v: string | number | null | undefined) =>
  `₦${Number(v ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  PAID: "bg-teal-100 text-teal-700",
};

function useProviders() {
  return useQuery({
    queryKey: ["hmo-providers"],
    queryFn: async () => (await api.get("/hmo/providers")).data,
  });
}

function ProviderDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ code: "", name: "", contactName: "", email: "", phone: "" });

  const save = useMutation({
    mutationFn: () =>
      api.post("/hmo/providers", {
        code: form.code,
        name: form.name,
        contactName: form.contactName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hmo-providers"] });
      toast({ title: "Provider added" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Insurer</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="prov-code" className="text-xs">Code *</Label>
              <Input id="prov-code" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prov-phone" className="text-xs">Phone</Label>
              <Input id="prov-phone" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="prov-name" className="text-xs">Name *</Label>
            <Input id="prov-name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prov-contact" className="text-xs">Claims contact</Label>
            <Input id="prov-contact" value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prov-email" className="text-xs">Email</Label>
            <Input id="prov-email" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.code || !form.name || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Insurer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: providers = [] } = useProviders();
  const [form, setForm] = useState({
    providerId: "", code: "", name: "", coveragePercent: "80", annualLimit: "", perVisitLimit: "",
  });

  const save = useMutation({
    mutationFn: () =>
      api.post("/hmo/plans", {
        providerId: form.providerId,
        code: form.code,
        name: form.name,
        coveragePercent: Number(form.coveragePercent),
        ...(form.annualLimit ? { annualLimit: Number(form.annualLimit) } : {}),
        ...(form.perVisitLimit ? { perVisitLimit: Number(form.perVisitLimit) } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hmo-providers"] });
      toast({ title: "Plan added" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const cover = Number(form.coveragePercent);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Plan</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Insurer *</Label>
            <Select value={form.providerId} onValueChange={(v) => setForm({ ...form, providerId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {providers.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan-code" className="text-xs">Code *</Label>
              <Input id="plan-code" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-name" className="text-xs">Name *</Label>
              <Input id="plan-name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-cover" className="text-xs">Insurer covers (%) *</Label>
            <Input id="plan-cover" type="number" value={form.coveragePercent}
              onChange={(e) => setForm({ ...form, coveragePercent: e.target.value })} />
            {cover >= 0 && cover <= 100 && (
              <p className="text-xs text-muted-foreground">
                The patient pays the remaining {100 - cover}% as a co-payment.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan-annual" className="text-xs">Annual limit (₦)</Label>
              <Input id="plan-annual" type="number" value={form.annualLimit}
                onChange={(e) => setForm({ ...form, annualLimit: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-visit" className="text-xs">Per-visit limit (₦)</Label>
              <Input id="plan-visit" type="number" value={form.perVisitLimit}
                onChange={(e) => setForm({ ...form, perVisitLimit: e.target.value })} />
              <p className="text-xs text-muted-foreground">Anything above falls to the patient.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.providerId || !form.code || !form.name || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnrolDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: providers = [] } = useProviders();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    patientId: "", planId: "", memberNumber: "",
    startsAt: new Date().toISOString().slice(0, 10), endsAt: "",
  });

  const { data: patients } = useQuery({
    queryKey: ["hmo-patient-search", search],
    queryFn: async () => (await api.get("/patients", { params: { search, limit: 8 } })).data,
    enabled: search.length >= 2,
  });

  const plans = providers.flatMap((p: any) =>
    (p.plans ?? []).map((pl: any) => ({ ...pl, providerName: p.name })),
  );

  const save = useMutation({
    mutationFn: () =>
      api.post("/hmo/enrolments", {
        patientId: form.patientId,
        planId: form.planId,
        memberNumber: form.memberNumber,
        startsAt: new Date(form.startsAt).toISOString(),
        ...(form.endsAt ? { endsAt: new Date(form.endsAt).toISOString() } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hmo-enrolments"] });
      toast({ title: "Patient enrolled" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const chosen = (patients?.data ?? []).find((p: any) => p.id === form.patientId);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Enrol a Patient</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="enr-search" className="text-xs">Find patient *</Label>
            <Input id="enr-search" placeholder="Name or MRN" value={search}
              onChange={(e) => setSearch(e.target.value)} />
            {(patients?.data ?? []).length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded border">
                {patients.data.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setForm({ ...form, patientId: p.id })}
                    className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${
                      form.patientId === p.id ? "bg-primary/10 font-medium" : ""
                    }`}
                  >
                    {p.firstName} {p.lastName} · {p.mrn}
                  </button>
                ))}
              </div>
            )}
            {chosen && (
              <p className="text-xs text-emerald-700">
                Selected {chosen.firstName} {chosen.lastName}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Plan *</Label>
            <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {plans.map((pl: any) => (
                  <SelectItem key={pl.id} value={pl.id}>
                    {pl.providerName} — {pl.name} ({Number(pl.coveragePercent)}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="enr-member" className="text-xs">Member number *</Label>
            <Input id="enr-member" value={form.memberNumber}
              onChange={(e) => setForm({ ...form, memberNumber: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="enr-from" className="text-xs">Cover starts *</Label>
              <Input id="enr-from" type="date" value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="enr-to" className="text-xs">Cover ends</Label>
              <Input id="enr-to" type="date" value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              <p className="text-xs text-muted-foreground">
                Blank means open-ended. Once past, scheme rates stop applying.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.patientId || !form.planId || !form.memberNumber || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enrol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjudicateDialog({ claim, onClose }: { claim: any; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const claimed = Number(claim.coveredAmount ?? claim.amount);
  const [approved, setApproved] = useState(String(claimed));
  const [reason, setReason] = useState("");

  const save = useMutation({
    mutationFn: () =>
      api.post(`/hmo/claims/${claim.id}/adjudicate`, {
        approvedAmount: Number(approved),
        ...(reason ? { rejectionReason: reason } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hmo-claims"] });
      qc.invalidateQueries({ queryKey: ["hmo-statement"] });
      toast({ title: "Decision recorded" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const shortfall = claimed - Number(approved || 0);
  const needsReason = Number(approved) === 0 && !reason;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record the Insurer&apos;s Decision</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between"><span>Claim</span><span className="font-mono">{claim.claimNumber}</span></div>
            <div className="flex justify-between"><span>Claimed from insurer</span><span className="font-medium">{naira(claimed)}</span></div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="adj-amount" className="text-xs">Approved amount (₦) *</Label>
            <Input id="adj-amount" type="number" value={approved}
              onChange={(e) => setApproved(e.target.value)} />
            {shortfall > 0 && (
              <p className="text-sm text-amber-700">
                {naira(shortfall)} declined — this is added to what the patient owes.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="adj-reason" className="text-xs">
              Reason {Number(approved) === 0 ? "*" : "(if anything was declined)"}
            </Label>
            <Input id="adj-reason" placeholder="e.g. Item not on tariff" value={reason}
              onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={needsReason || approved === "" || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemittanceDialog({ claim, onClose }: { claim: any; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const approved = Number(claim.approvedAmount ?? 0);
  const alreadyPaid = Number(claim.paidAmount ?? 0);
  const outstanding = approved - alreadyPaid;
  const [amount, setAmount] = useState(String(outstanding));
  const [reference, setReference] = useState("");

  const save = useMutation({
    mutationFn: () =>
      api.post(`/hmo/claims/${claim.id}/remittance`, {
        amount: Number(amount),
        ...(reference ? { reference } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hmo-claims"] });
      qc.invalidateQueries({ queryKey: ["hmo-statement"] });
      toast({ title: "Remittance recorded" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const tooMuch = Number(amount) > outstanding;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record a Remittance</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between"><span>Approved</span><span>{naira(approved)}</span></div>
            <div className="flex justify-between"><span>Already received</span><span>{naira(alreadyPaid)}</span></div>
            <div className="flex justify-between font-medium"><span>Outstanding</span><span>{naira(outstanding)}</span></div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rem-amount" className="text-xs">Amount received (₦) *</Label>
            <Input id="rem-amount" type="number" value={amount}
              onChange={(e) => setAmount(e.target.value)} />
            {tooMuch && (
              <p className="text-sm text-red-600">
                That is more than the {naira(outstanding)} still outstanding.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="rem-ref" className="text-xs">Reference</Label>
            <Input id="rem-ref" placeholder="Remittance advice number" value={reference}
              onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={tooMuch || Number(amount) <= 0 || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EligibilityCheck() {
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState("");

  const { data: patients } = useQuery({
    queryKey: ["hmo-elig-search", search],
    queryFn: async () => (await api.get("/patients", { params: { search, limit: 6 } })).data,
    enabled: search.length >= 2,
  });

  const { data: elig, isFetching } = useQuery({
    queryKey: ["hmo-eligibility", patientId],
    queryFn: async () => (await api.get(`/hmo/eligibility/${patientId}`)).data,
    enabled: Boolean(patientId),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Check cover before treating
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="elig-search" className="text-xs">Patient</Label>
          <Input id="elig-search" placeholder="Name or MRN" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        {(patients?.data ?? []).length > 0 && (
          <div className="max-h-28 overflow-y-auto rounded border">
            {patients.data.map((p: any) => (
              <button key={p.id} type="button" onClick={() => setPatientId(p.id)}
                className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${
                  patientId === p.id ? "bg-primary/10 font-medium" : ""
                }`}>
                {p.firstName} {p.lastName} · {p.mrn}
              </button>
            ))}
          </div>
        )}

        {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}

        {elig && !isFetching && (
          elig.covered ? (
            <div className="space-y-1 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm dark:bg-emerald-950/30">
              <p className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Covered
              </p>
              <p>{elig.enrolment.provider.name} — {elig.enrolment.plan.name}</p>
              <p className="text-xs text-muted-foreground">
                Member {elig.enrolment.memberNumber} · insurer pays{" "}
                {Number(elig.enrolment.plan.coveragePercent)}%
                {elig.remainingThisYear !== null &&
                  ` · ${naira(elig.remainingThisYear)} left this year`}
              </p>
              {elig.enrolment.plan.requiresPreAuth && (
                <p className="text-xs font-medium text-amber-700">
                  This plan needs pre-authorisation before treatment.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
              <p className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" /> Not covered
              </p>
              <p className="text-xs">{elig.reason} — the patient pays in full.</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

export function HmoPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<"provider" | "plan" | "enrol" | null>(null);
  const [adjudicating, setAdjudicating] = useState<any>(null);
  const [remitting, setRemitting] = useState<any>(null);

  const { data: providers = [] } = useProviders();
  const { data: claims = [] } = useQuery({
    queryKey: ["hmo-claims"],
    queryFn: async () => (await api.get("/hmo/claims")).data,
  });
  const { data: enrolments = [] } = useQuery({
    queryKey: ["hmo-enrolments"],
    queryFn: async () => (await api.get("/hmo/enrolments")).data,
  });
  const { data: statement = [] } = useQuery({
    queryKey: ["hmo-statement"],
    queryFn: async () => (await api.get("/hmo/statement")).data,
  });

  const submit = useMutation({
    mutationFn: (id: string) => api.post(`/hmo/claims/${id}/submit`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hmo-claims"] });
      qc.invalidateQueries({ queryKey: ["hmo-statement"] });
      toast({
        title: "Claim submitted",
        description: "The covered share now sits against the insurer, not the patient.",
      });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const openClaims = claims.filter((c: any) =>
    ["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(c.status),
  ).length;
  const outstanding = statement.reduce((a: number, s: any) => a + Number(s.outstanding), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldPlus className="h-6 w-6" /> Insurance &amp; HMO
          </h1>
          <p className="text-sm text-muted-foreground">
            Contracts, who is covered, and what each insurer owes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialog("provider")}>
            <Building2 className="mr-2 h-4 w-4" /> Add Insurer
          </Button>
          <Button variant="outline" onClick={() => setDialog("plan")}>
            <Plus className="mr-2 h-4 w-4" /> Add Plan
          </Button>
          <Button onClick={() => setDialog("enrol")}>
            <UserPlus className="mr-2 h-4 w-4" /> Enrol Patient
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Insurers", value: providers.length },
          { label: "Patients Covered", value: enrolments.length },
          { label: "Open Claims", value: openClaims },
          { label: "Owed by Insurers", value: naira(outstanding), wide: true },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="px-4 pb-1 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`font-bold ${s.wide ? "text-xl" : "text-2xl"}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="claims">
        <TabsList>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
          <TabsTrigger value="enrolments">Enrolments</TabsTrigger>
          <TabsTrigger value="statement">Insurer Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Insurer</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">From insurer</TableHead>
                    <TableHead className="text-right">Patient pays</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        No claims yet. Raise one from a billed encounter.
                      </TableCell>
                    </TableRow>
                  )}
                  {claims.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.claimNumber}</TableCell>
                      <TableCell className="text-sm">
                        {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.hmoProvider?.name ?? c.provider}
                      </TableCell>
                      <TableCell className="text-right text-sm">{naira(c.amount)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {/*
                          Once a decision is in, what the insurer will actually
                          pay is the approved amount. Showing the amount first
                          claimed made this column and the patient's column add
                          up to more than the bill.
                        */}
                        {naira(c.approvedAmount ?? c.coveredAmount)}
                        {c.approvedAmount != null &&
                          Number(c.approvedAmount) < Number(c.coveredAmount) && (
                            <div className="text-xs font-normal text-muted-foreground">
                              claimed {naira(c.coveredAmount)}
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{naira(c.patientPortion)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLE[c.status] ?? ""}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === "DRAFT" && (
                          <Button size="sm" variant="outline" disabled={submit.isPending}
                            onClick={() => submit.mutate(c.id)}>
                            <Send className="mr-1 h-3 w-3" /> Submit
                          </Button>
                        )}
                        {["SUBMITTED", "UNDER_REVIEW"].includes(c.status) && (
                          <Button size="sm" variant="outline" onClick={() => setAdjudicating(c)}>
                            <FileText className="mr-1 h-3 w-3" /> Decision
                          </Button>
                        )}
                        {c.status === "APPROVED" && (
                          <Button size="sm" variant="outline" onClick={() => setRemitting(c)}>
                            <Banknote className="mr-1 h-3 w-3" /> Remittance
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eligibility" className="mt-4">
          <div className="max-w-md"><EligibilityCheck /></div>
        </TabsContent>

        <TabsContent value="enrolments" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Insurer / Plan</TableHead>
                    <TableHead>Member no.</TableHead>
                    <TableHead>Valid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrolments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        Nobody enrolled yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {enrolments.map((e: any) => {
                    const expired = e.endsAt && new Date(e.endsAt) < new Date();
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">
                          {e.patient.firstName} {e.patient.lastName}
                          <span className="ml-1 font-mono text-xs text-muted-foreground">
                            {e.patient.mrn}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.provider.name} — {e.plan.name}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({Number(e.plan.coveragePercent)}%)
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{e.memberNumber}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(e.startsAt).toLocaleDateString("en-NG")} –{" "}
                          {e.endsAt ? new Date(e.endsAt).toLocaleDateString("en-NG") : "open"}
                        </TableCell>
                        <TableCell>
                          <Badge className={expired ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}>
                            {expired ? "LAPSED" : e.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statement" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insurer</TableHead>
                    <TableHead className="text-right">Claims</TableHead>
                    <TableHead className="text-right">Claimed</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Approval rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        No insurers on file.
                      </TableCell>
                    </TableRow>
                  )}
                  {statement.map((s: any) => {
                    const rate = s.approvalRate === null ? null : Number(s.approvalRate);
                    return (
                      <TableRow key={s.providerId}>
                        <TableCell className="text-sm font-medium">{s.name}</TableCell>
                        <TableCell className="text-right text-sm">
                          {s.claimCount}
                          {s.openClaims > 0 && (
                            <span className="ml-1 text-xs text-amber-700">({s.openClaims} open)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">{naira(s.claimed)}</TableCell>
                        <TableCell className="text-right text-sm">{naira(s.approved)}</TableCell>
                        <TableCell className="text-right text-sm">{naira(s.paid)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {naira(s.outstanding)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {rate === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            // An insurer honouring well below what it is billed
                            // is costing more than its tariff suggests.
                            <span className={rate < 80 ? "font-medium text-amber-700" : ""}>
                              {rate}%
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dialog === "provider" && <ProviderDialog onClose={() => setDialog(null)} />}
      {dialog === "plan" && <PlanDialog onClose={() => setDialog(null)} />}
      {dialog === "enrol" && <EnrolDialog onClose={() => setDialog(null)} />}
      {adjudicating && <AdjudicateDialog claim={adjudicating} onClose={() => setAdjudicating(null)} />}
      {remitting && <RemittanceDialog claim={remitting} onClose={() => setRemitting(null)} />}
    </div>
  );
}
