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
import { Plus, Star, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["GENERAL","DOCTOR","NURSE","PHARMACY","LABORATORY","BILLING","CLEANLINESS","WAITING_TIME","FOOD","OTHER"];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    SUBMITTED: "bg-blue-100 text-blue-800",
    ACKNOWLEDGED: "bg-yellow-100 text-yellow-800",
    RESOLVED: "bg-green-100 text-green-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function categoryBadge(cat: string) {
  const colors: Record<string, string> = {
    DOCTOR: "bg-purple-100 text-purple-800",
    NURSE: "bg-blue-100 text-blue-800",
    PHARMACY: "bg-green-100 text-green-800",
    LABORATORY: "bg-teal-100 text-teal-800",
    BILLING: "bg-orange-100 text-orange-800",
    WAITING_TIME: "bg-red-100 text-red-800",
    CLEANLINESS: "bg-cyan-100 text-cyan-800",
  };
  return <Badge className={colors[cat] ?? "bg-gray-100 text-gray-800"}>{cat.replace(/_/g, " ")}</Badge>;
}

function SubmitFeedbackDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [form, setForm] = useState({ patientId: "", category: "GENERAL", title: "", message: "", isAnonymous: false });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/feedback", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Submit Feedback</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Patient Feedback</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Patient ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Leave blank for anonymous" />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map((s) => (
                <button key={s} type="button" onClick={() => setRating(s)}>
                  <Star className={`h-7 w-7 transition-colors ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30 hover:text-yellow-300"}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Summary of your feedback" />
          </div>
          <div className="space-y-1">
            <Label>Message</Label>
            <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} placeholder="Describe your experience..." />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isAnonymous} onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} className="rounded" />
            Submit anonymously
          </label>
          <Button className="w-full" disabled={!form.message || mutation.isPending} onClick={() => mutation.mutate({ ...form, rating })}>
            {mutation.isPending ? "Submitting..." : "Submit Feedback"}
          </Button>
          {mutation.isError && <p className="text-xs text-red-600">{(mutation.error as any)?.response?.data?.message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackSheet({ feedback, open, onClose, onRefresh }: { feedback: any; open: boolean; onClose: () => void; onRefresh: () => void }) {
  const [response, setResponse] = useState(feedback.response ?? "");
  const [status, setStatus] = useState("ACKNOWLEDGED");

  const respond = useMutation({
    mutationFn: () => api.patch(`/feedback/${feedback.id}/respond`, { response, status }).then((r) => r.data),
    onSuccess: onRefresh,
  });

  if (!feedback) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{feedback.feedbackNumber}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex gap-2 items-center flex-wrap">
            {categoryBadge(feedback.category)}
            {statusBadge(feedback.status)}
            <StarRating rating={feedback.rating} />
          </div>
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            {!feedback.isAnonymous && feedback.patient && (
              <div className="flex gap-2"><span className="text-muted-foreground w-20">Patient</span><span>{feedback.patient.firstName} {feedback.patient.lastName}</span></div>
            )}
            {feedback.isAnonymous && <div className="text-muted-foreground text-xs">Anonymous submission</div>}
            <div className="flex gap-2"><span className="text-muted-foreground w-20">Submitted</span><span>{format(new Date(feedback.createdAt), "dd MMM yyyy HH:mm")}</span></div>
          </div>
          {feedback.title && <p className="font-medium">{feedback.title}</p>}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback.message}</p>
          {feedback.response && (
            <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-3 text-sm">
              <p className="font-medium text-green-700 dark:text-green-400 text-xs mb-1">Staff Response — {feedback.respondedBy?.firstName} {feedback.respondedBy?.lastName}</p>
              <p>{feedback.response}</p>
            </div>
          )}
          {feedback.status !== "RESOLVED" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Your Response</Label>
                <Textarea rows={3} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Write a response to this feedback..." />
              </div>
              <div className="flex items-center gap-2">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACKNOWLEDGED">Acknowledge</SelectItem>
                    <SelectItem value="RESOLVED">Mark Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => respond.mutate()} disabled={!response || respond.isPending}>
                  <CheckCircle className="mr-1 h-4 w-4" />Submit Response
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function FeedbackPage() {
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<any>(null);

  const { data: summary } = useQuery({
    queryKey: ["feedback-summary"],
    queryFn: () => api.get("/feedback/summary").then((r) => r.data),
  });

  const { data: feedbacks = [], refetch } = useQuery({
    queryKey: ["feedbacks", categoryFilter, statusFilter],
    queryFn: () => api.get("/feedback", { params: { ...(categoryFilter !== "ALL" && { category: categoryFilter }), ...(statusFilter !== "ALL" && { status: statusFilter }) } }).then((r) => r.data),
  });

  const invalidate = () => { refetch(); qc.invalidateQueries({ queryKey: ["feedback-summary"] }); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Feedback</h1>
          <p className="text-muted-foreground">Satisfaction surveys and patient experience</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.avgRating != null ? `${summary.avgRating} / 5` : "—"}</div>
            {summary?.avgRating && <StarRating rating={Math.round(summary.avgRating)} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.total ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Response</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.submitted ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.resolved ?? 0}</div></CardContent>
        </Card>
      </div>

      {summary?.ratingDist && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Rating Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {[5,4,3,2,1].map((r) => {
                const count = summary.ratingDist[r] ?? 0;
                const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
                return (
                  <div key={r} className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-0.5 w-16">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /><span>{r}</span>
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-muted-foreground text-xs text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <SubmitFeedbackDialog onSuccess={invalidate} />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feedback #</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedbacks.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No feedback found</TableCell></TableRow>
            )}
            {feedbacks.map((f: any) => (
              <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(f)}>
                <TableCell className="font-mono text-xs">{f.feedbackNumber}</TableCell>
                <TableCell>{categoryBadge(f.category)}</TableCell>
                <TableCell className="text-sm">{f.isAnonymous ? "Anonymous" : f.patient ? `${f.patient.firstName} ${f.patient.lastName}` : "—"}</TableCell>
                <TableCell className="text-sm max-w-[160px] truncate">{f.title ?? f.message.slice(0, 40) + "…"}</TableCell>
                <TableCell><StarRating rating={f.rating} /></TableCell>
                <TableCell>{statusBadge(f.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(f.createdAt), "dd MMM yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {selected && (
        <FeedbackSheet feedback={selected} open={!!selected} onClose={() => setSelected(null)} onRefresh={invalidate} />
      )}
    </div>
  );
}
