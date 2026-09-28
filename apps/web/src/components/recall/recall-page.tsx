"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PhoneCall, Loader2, Plus, AlertTriangle, CalendarCheck, CheckCircle2, XCircle,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
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

const CHANNELS = ["PHONE", "SMS", "EMAIL", "IN_PERSON"];
const OUTCOMES = ["REACHED", "NO_ANSWER", "WRONG_NUMBER", "DECLINED", "RESCHEDULED"];

const pretty = (v: string) =>
  v.replace(/_/g, " ").toLowerCase().replace(/^./, (m) => m.toUpperCase());

const STATUS_STYLE: Record<string, string> = {
  DUE: "bg-blue-100 text-blue-700",
  BOOKED: "bg-emerald-100 text-emerald-700",
  ATTENDED: "bg-teal-100 text-teal-700",
  MISSED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

const asDate = (d: string) => new Date(d).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

function RaiseDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ patientId: "", reason: "", dueOn: "", instructions: "" });

  const { data: patients } = useQuery({
    queryKey: ["recall-patient-search", search],
    queryFn: async () => (await api.get("/patients", { params: { search, limit: 6 } })).data,
    enabled: search.length >= 2,
  });

  const raise = useMutation({
    mutationFn: () =>
      api.post("/recalls", {
        patientId: form.patientId,
        reason: form.reason,
        dueOn: new Date(form.dueOn).toISOString(),
        ...(form.instructions ? { instructions: form.instructions } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recalls"] });
      qc.invalidateQueries({ queryKey: ["recall-summary"] });
      toast({ title: "Recall added" });
      onClose();
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not add the recall"), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add a Recall</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="rc-patient" className="text-xs">Patient *</Label>
            <Input id="rc-patient" placeholder="Name or MRN" value={search}
              onChange={(e) => setSearch(e.target.value)} />
            {(patients?.data ?? []).length > 0 && (
              <div className="max-h-28 overflow-y-auto rounded border">
                {patients.data.map((p: any) => (
                  <button key={p.id} type="button"
                    onClick={() => setForm({ ...form, patientId: p.id })}
                    className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${
                      form.patientId === p.id ? "bg-primary/10 font-medium" : ""
                    }`}>
                    {p.firstName} {p.lastName} · {p.mrn}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="rc-reason" className="text-xs">Reason *</Label>
            <Input id="rc-reason" placeholder="Wound review" value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              Whoever rings the patient will read this out.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rc-due" className="text-xs">Due on *</Label>
            <Input id="rc-due" type="date" value={form.dueOn}
              onChange={(e) => setForm({ ...form, dueOn: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rc-instructions" className="text-xs">Instructions</Label>
            <Input id="rc-instructions" value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.patientId || !form.reason || !form.dueOn || raise.isPending}
            onClick={() => raise.mutate()}>
            {raise.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Recall
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttemptDialog({ recall, onClose }: { recall: any; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ channel: "PHONE", outcome: "NO_ANSWER", note: "" });

  const log = useMutation({
    mutationFn: () =>
      api.post(`/recalls/${recall.id}/attempts`, {
        channel: form.channel,
        outcome: form.outcome,
        ...(form.note ? { note: form.note } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recalls"] });
      qc.invalidateQueries({ queryKey: ["recall-summary"] });
      toast({ title: "Attempt recorded" });
      onClose();
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not record the attempt"), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record a Contact Attempt</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded border bg-muted/40 p-3 text-sm">
            <p className="font-medium">
              {recall.patient.firstName} {recall.patient.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {recall.patient.phone ?? "no phone on file"} · {recall.reason} · due {asDate(recall.dueOn)}
            </p>
          </div>

          {(recall.attempts ?? []).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Already tried</p>
              {recall.attempts.map((a: any) => (
                <p key={a.id} className="text-xs">
                  {new Date(a.createdAt).toLocaleDateString("en-NG")} · {pretty(a.channel)} ·{" "}
                  <span className={a.outcome === "REACHED" ? "text-emerald-700" : "text-amber-700"}>
                    {pretty(a.outcome)}
                  </span>
                  {a.note && ` — ${a.note}`}
                </p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">How</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => <SelectItem key={c} value={c}>{pretty(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">What happened</Label>
              <Select value={form.outcome} onValueChange={(v) => setForm({ ...form, outcome: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => <SelectItem key={o} value={o}>{pretty(o)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rc-note" className="text-xs">Note</Label>
            <Input id="rc-note" value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={log.isPending} onClick={() => log.mutate()}>
            {log.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({ recall, onClose }: { recall: any; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  const done = () => {
    qc.invalidateQueries({ queryKey: ["recalls"] });
    qc.invalidateQueries({ queryKey: ["recall-summary"] });
    onClose();
  };

  const cancel = useMutation({
    mutationFn: () => api.patch(`/recalls/${recall.id}/cancel`, { reason }),
    onSuccess: () => { toast({ title: "Recall closed" }); done(); },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not close it"), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Close Without Seeing the Patient</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {recall.patient.firstName} {recall.patient.lastName} will drop off the worklist
            without attending. That needs a reason on the record.
          </p>
          <div className="space-y-1">
            <Label htmlFor="rc-close" className="text-xs">Reason *</Label>
            <Input id="rc-close" placeholder="e.g. Seen elsewhere, no longer required"
              value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={!reason.trim() || cancel.isPending}
            onClick={() => cancel.mutate()}>
            {cancel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Close Recall
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecallPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [raising, setRaising] = useState(false);
  const [attempting, setAttempting] = useState<any>(null);
  const [closing, setClosing] = useState<any>(null);
  const [tab, setTab] = useState("overdue");

  const { data: recalls = [], isLoading } = useQuery({
    queryKey: ["recalls", tab],
    queryFn: async () =>
      (await api.get("/recalls", {
        params: tab === "all" ? {} : { due: tab },
      })).data,
  });

  const { data: summary } = useQuery({
    queryKey: ["recall-summary"],
    queryFn: async () => (await api.get("/recalls/summary")).data,
  });

  const attended = useMutation({
    mutationFn: (id: string) => api.patch(`/recalls/${id}/attended`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recalls"] });
      qc.invalidateQueries({ queryKey: ["recall-summary"] });
      toast({ title: "Marked as attended" });
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not update"), variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <PhoneCall className="h-6 w-6" /> Patient Recall
          </h1>
          <p className="text-sm text-muted-foreground">
            Patients who were told to come back, and whether they did.
          </p>
        </div>
        <Button onClick={() => setRaising(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Recall
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        {[
          { label: "Overdue", value: summary?.overdue ?? 0, alert: (summary?.overdue ?? 0) > 0 },
          { label: "Due Today", value: summary?.dueToday ?? 0 },
          { label: "Booked", value: summary?.booked ?? 0 },
          { label: "Not Reached", value: summary?.unreached ?? 0, alert: (summary?.unreached ?? 0) > 0 },
          {
            label: "Attended",
            value: summary?.attendanceRate === null || summary?.attendanceRate === undefined
              ? "—"
              : `${summary.attendanceRate}%`,
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="px-4 pb-1 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-2xl font-bold ${s.alert ? "text-amber-600" : ""}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="today">Due Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Tried</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recalls.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          Nobody to chase here.
                        </TableCell>
                      </TableRow>
                    )}
                    {recalls.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {r.patient.firstName} {r.patient.lastName}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {r.patient.mrn}
                            {r.patient.phone ? ` · ${r.patient.phone}` : " · no phone on file"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.reason}
                          {r.instructions && (
                            <div className="text-xs text-muted-foreground">{r.instructions}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.isOverdue ? (
                            <span className="flex items-center gap-1 font-medium text-red-600">
                              <AlertTriangle className="h-3 w-3" /> {asDate(r.dueOn)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{asDate(r.dueOn)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_STYLE[r.status]}>{pretty(r.status)}</Badge>
                          {r.appointment && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarCheck className="h-3 w-3" />
                              {asDate(r.appointment.scheduledAt)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {r.attemptCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {!["ATTENDED", "CANCELLED"].includes(r.status) && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" title="Record a contact attempt"
                                onClick={() => setAttempting(r)}>
                                <PhoneCall className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Mark as attended"
                                onClick={() => attended.mutate(r.id)}>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Close without seeing the patient"
                                onClick={() => setClosing(r)}>
                                <XCircle className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {raising && <RaiseDialog onClose={() => setRaising(false)} />}
      {attempting && <AttemptDialog recall={attempting} onClose={() => setAttempting(null)} />}
      {closing && <CloseDialog recall={closing} onClose={() => setClosing(null)} />}
    </div>
  );
}
