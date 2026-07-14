"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Star, Users, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const PERIODS = ["ANNUAL", "SEMI_ANNUAL", "QUARTERLY"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    REVIEWED: "bg-yellow-100 text-yellow-800",
    FINALIZED: "bg-green-100 text-green-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function ScoreInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-medium text-primary">{value ? `${value}/5` : "—"}</span>
      </div>
      <input
        type="range"
        min="1" max="5" step="0.5"
        value={value || "3"}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
      </div>
    </div>
  );
}

function CreateAppraisalDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    staffId: "", reviewedById: "", period: "ANNUAL", year: String(new Date().getFullYear()), quarter: "",
    goals: "", staffComments: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/appraisals", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Appraisal</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create Staff Appraisal</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Staff ID (Employee being appraised)</Label>
            <Input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Reviewer Staff ID</Label>
            <Input value={form.reviewedById} onChange={(e) => setForm({ ...form, reviewedById: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Period</Label>
              <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            {form.period === "QUARTERLY" && (
              <div className="space-y-1">
                <Label>Quarter</Label>
                <Select value={form.quarter} onValueChange={(v) => setForm({ ...form, quarter: v })}>
                  <SelectTrigger><SelectValue placeholder="Q" /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4].map((q) => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>Goals for Period</Label>
            <Textarea value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} rows={2} />
          </div>
          <Button className="w-full" disabled={!form.staffId || !form.reviewedById || mutation.isPending} onClick={() => mutation.mutate(form)}>
            {mutation.isPending ? "Creating..." : "Create Appraisal"}
          </Button>
          {mutation.isError && <p className="text-xs text-red-600">{(mutation.error as any)?.response?.data?.message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AppraisalSheet({ appraisal, open, onClose, onRefresh }: { appraisal: any; open: boolean; onClose: () => void; onRefresh: () => void }) {
  const [scores, setScores] = useState({
    attendanceScore: String(appraisal.attendanceScore ?? "3"),
    performanceScore: String(appraisal.performanceScore ?? "3"),
    teamworkScore: String(appraisal.teamworkScore ?? "3"),
    initiativeScore: String(appraisal.initiativeScore ?? "3"),
  });
  const [text, setText] = useState({
    strengths: appraisal.strengths ?? "",
    improvements: appraisal.improvements ?? "",
    goals: appraisal.goals ?? "",
    reviewerComments: appraisal.reviewerComments ?? "",
  });

  const update = useMutation({
    mutationFn: (data: any) => api.patch(`/appraisals/${appraisal.id}`, data).then((r) => r.data),
    onSuccess: onRefresh,
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/appraisals/${appraisal.id}/status`, { status }).then((r) => r.data),
    onSuccess: onRefresh,
  });

  const nextStatus: Record<string, string> = { DRAFT: "SUBMITTED", SUBMITTED: "REVIEWED", REVIEWED: "FINALIZED" };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{appraisal.appraisalNumber}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Staff</span><span className="font-medium">{appraisal.staff?.firstName} {appraisal.staff?.lastName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dept</span><span>{appraisal.staff?.department?.name ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span>{appraisal.period.replace(/_/g, " ")} {appraisal.year}{appraisal.quarter ? ` Q${appraisal.quarter}` : ""}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reviewer</span><span>{appraisal.reviewedBy?.firstName} {appraisal.reviewedBy?.lastName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span>{statusBadge(appraisal.status)}</div>
            {appraisal.overallScore && (
              <div className="flex justify-between"><span className="text-muted-foreground">Overall Score</span><span className="font-semibold text-primary">{Number(appraisal.overallScore).toFixed(1)} / 5</span></div>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium">Scoring (1–5)</p>
            <ScoreInput label="Attendance & Punctuality" value={scores.attendanceScore} onChange={(v) => setScores({ ...scores, attendanceScore: v })} />
            <ScoreInput label="Job Performance" value={scores.performanceScore} onChange={(v) => setScores({ ...scores, performanceScore: v })} />
            <ScoreInput label="Teamwork & Collaboration" value={scores.teamworkScore} onChange={(v) => setScores({ ...scores, teamworkScore: v })} />
            <ScoreInput label="Initiative & Innovation" value={scores.initiativeScore} onChange={(v) => setScores({ ...scores, initiativeScore: v })} />
          </div>

          <div className="space-y-3">
            {([
              ["strengths", "Strengths"],
              ["improvements", "Areas for Improvement"],
              ["goals", "Goals / Objectives"],
              ["reviewerComments", "Reviewer Comments"],
            ] as [string, string][]).map(([field, label]) => (
              <div key={field} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Textarea rows={2} value={(text as any)[field]} onChange={(e) => setText({ ...text, [field]: e.target.value })} />
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => update.mutate({ ...scores, ...text })} disabled={update.isPending}>
              Save Scores
            </Button>
            {nextStatus[appraisal.status] && (
              <Button size="sm" onClick={() => updateStatus.mutate(nextStatus[appraisal.status]!)} disabled={updateStatus.isPending}>
                → {nextStatus[appraisal.status]}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppraisalsPage() {
  const qc = useQueryClient();
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<any>(null);

  const { data: summary } = useQuery({
    queryKey: ["appraisal-summary", yearFilter],
    queryFn: () => api.get("/appraisals/summary", { params: { year: yearFilter } }).then((r) => r.data),
  });

  const { data: appraisals = [], refetch } = useQuery({
    queryKey: ["appraisals", yearFilter, statusFilter],
    queryFn: () => api.get("/appraisals", { params: { year: yearFilter, ...(statusFilter !== "ALL" && { status: statusFilter }) } }).then((r) => r.data),
  });

  const invalidate = () => { refetch(); qc.invalidateQueries({ queryKey: ["appraisal-summary"] }); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Appraisals</h1>
          <p className="text-muted-foreground">Performance reviews and evaluations</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.total ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{(summary?.draft ?? 0) + (summary?.submitted ?? 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.avgScore != null ? `${summary.avgScore} / 5` : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Finalized</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.finalized ?? 0}</div></CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input className="w-24" type="number" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="REVIEWED">Reviewed</SelectItem>
            <SelectItem value="FINALIZED">Finalized</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <CreateAppraisalDialog onSuccess={invalidate} />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Appraisal #</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appraisals.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No appraisals found</TableCell></TableRow>
            )}
            {appraisals.map((a: any) => (
              <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(a)}>
                <TableCell className="font-mono text-xs">{a.appraisalNumber}</TableCell>
                <TableCell className="font-medium">{a.staff?.firstName} {a.staff?.lastName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.staff?.department?.name ?? "—"}</TableCell>
                <TableCell className="text-sm">{a.period.replace(/_/g, " ")} {a.year}{a.quarter ? ` Q${a.quarter}` : ""}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.reviewedBy?.firstName} {a.reviewedBy?.lastName}</TableCell>
                <TableCell>
                  {a.overallScore != null ? (
                    <span className="font-semibold text-primary">{Number(a.overallScore).toFixed(1)}</span>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>{statusBadge(a.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(a.createdAt), "dd MMM yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {selected && (
        <AppraisalSheet appraisal={selected} open={!!selected} onClose={() => setSelected(null)} onRefresh={invalidate} />
      )}
    </div>
  );
}
