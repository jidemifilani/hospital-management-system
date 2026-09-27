"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarOff, Plus, CheckCircle2, XCircle, Clock,
  Loader2, ChevronLeft, ChevronRight, Users, CalendarDays,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const LEAVE_TYPES = [
  "ANNUAL", "SICK", "MATERNITY", "PATERNITY", "EMERGENCY", "STUDY", "UNPAID",
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING:  "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED:"bg-gray-100 text-gray-500",
};

const applySchema = z.object({
  type: z.enum(LEAVE_TYPES),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().min(1, "Required"),
  reason: z.string().min(10, "At least 10 characters"),
});

type ApplyForm = z.infer<typeof applySchema>;

interface LeaveRequest {
  id: string; type: string; status: string; startDate: string; endDate: string;
  days: number; reason: string; createdAt: string; rejectionNote?: string;
  staff: { id: string; firstName: string; lastName: string; employeeId: string; department: { name: string } };
  approvedBy?: { firstName: string; lastName: string };
}

function SummaryCards({ summary }: { summary: any }) {
  if (!summary) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="flex items-center gap-3 pt-4">
          <Clock className="h-8 w-8 text-amber-500 rounded-lg bg-amber-50 p-1.5" />
          <div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
            <p className="text-2xl font-bold">{summary.byStatus?.PENDING ?? 0}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 pt-4">
          <Users className="h-8 w-8 text-blue-500 rounded-lg bg-blue-50 p-1.5" />
          <div>
            <p className="text-xs text-muted-foreground">On Leave Today</p>
            <p className="text-2xl font-bold">{summary.onLeaveToday}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 pt-4">
          <CalendarDays className="h-8 w-8 text-green-500 rounded-lg bg-green-50 p-1.5" />
          <div>
            <p className="text-xs text-muted-foreground">Days Approved (Month)</p>
            <p className="text-2xl font-bold">{summary.daysApprovedThisMonth}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LeaveTable({
  items, isLoading, canManage, onReview,
}: {
  items: LeaveRequest[]; isLoading: boolean; canManage: boolean;
  onReview?: (item: LeaveRequest, decision: "APPROVED" | "REJECTED") => void;
}) {
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (items.length === 0) return <p className="py-12 text-center text-sm text-muted-foreground">No leave requests found.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
            <th className="px-4 py-2 text-left font-medium">Staff</th>
            <th className="px-4 py-2 text-left font-medium">Type</th>
            <th className="px-4 py-2 text-left font-medium">Period</th>
            <th className="px-4 py-2 text-left font-medium">Days</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Applied</th>
            {canManage && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {items.map((req) => (
            <tr key={req.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="px-4 py-3">
                <p className="font-medium">{req.staff.firstName} {req.staff.lastName}</p>
                <p className="text-xs text-muted-foreground">{req.staff.department?.name} · {req.staff.employeeId}</p>
              </td>
              <td className="px-4 py-3 text-xs">{req.type.replace("_", " ")}</td>
              <td className="px-4 py-3 text-xs">
                {formatDate(req.startDate)} – {formatDate(req.endDate)}
              </td>
              <td className="px-4 py-3 font-medium">{req.days}d</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[req.status] ?? ""}`}>
                  {req.status}
                </span>
                {req.status === "APPROVED" && req.approvedBy && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    by {req.approvedBy.firstName} {req.approvedBy.lastName}
                  </p>
                )}
                {req.status === "REJECTED" && req.rejectionNote && (
                  <p className="text-[10px] text-red-600 mt-0.5 max-w-[160px] truncate">{req.rejectionNote}</p>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(req.createdAt)}</td>
              {canManage && (
                <td className="px-4 py-3">
                  {req.status === "PENDING" && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"
                        onClick={() => onReview?.(req, "APPROVED")}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600"
                        onClick={() => onReview?.(req, "REJECTED")}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeavePage() {
  const [showApply, setShowApply] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ item: LeaveRequest; decision: "APPROVED" | "REJECTED" } | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const qc = useQueryClient();

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<ApplyForm>({
    resolver: zodResolver(applySchema),
    defaultValues: { type: "ANNUAL" },
  });

  const { data: summary } = useQuery({
    queryKey: ["leave-summary"],
    queryFn: () => api.get("/leave/summary").then((r) => r.data),
  });

  const { data, isLoading } = useQuery<{ data: LeaveRequest[]; total: number; pages: number }>({
    queryKey: ["leave-requests", page, statusFilter],
    queryFn: () =>
      api.get("/leave", {
        params: { page, limit: 20, status: statusFilter === "ALL" ? undefined : statusFilter },
      }).then((r) => r.data),
  });

  const apply = useMutation({
    mutationFn: (dto: ApplyForm) => api.post("/leave", dto).then((r) => r.data),
    onSuccess: () => {
      toast.success("Leave request submitted");
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["leave-summary"] });
      reset();
      setShowApply(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed to apply"),
  });

  const review = useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: string; note?: string }) =>
      api.patch(`/leave/${id}/review`, { decision, rejectionNote: note }).then((r) => r.data),
    onSuccess: (_, vars) => {
      toast.success(`Leave ${vars.decision === "APPROVED" ? "approved" : "rejected"}`);
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["leave-summary"] });
      setReviewTarget(null);
      setRejectionNote("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });

  const items = data?.data ?? [];
  const total = data?.total;
  const pages = data?.pages ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarOff className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Leave Management</h1>
            <p className="text-sm text-muted-foreground">Manage staff leave requests and approvals</p>
          </div>
        </div>
        <Button onClick={() => setShowApply(true)}>
          <Plus className="mr-2 h-4 w-4" />Apply for Leave
        </Button>
      </div>

      <SummaryCards summary={summary} />

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((s) => (
              <SelectItem key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {total !== undefined && <span className="text-xs text-muted-foreground">{total} requests</span>}
      </div>

      <LeaveTable
        items={items}
        isLoading={isLoading}
        canManage={true}
        onReview={(item, decision) => { setReviewTarget({ item, decision }); setRejectionNote(""); }}
      />

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Apply dialog */}
      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => apply.mutate(d))} className="space-y-4">
            <div>
              <Label>Leave Type</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" className="mt-1" {...register("startDate")} min={new Date().toISOString().split("T")[0]} />
                {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" className="mt-1" {...register("endDate")} min={watch("startDate")} />
                {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate.message}</p>}
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea className="mt-1" rows={3} placeholder="Explain the reason for leave…" {...register("reason")} />
              {errors.reason && <p className="text-xs text-destructive mt-1">{errors.reason.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowApply(false)}>Cancel</Button>
              <Button type="submit" disabled={apply.isPending}>
                {apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={() => { setReviewTarget(null); setRejectionNote(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {reviewTarget?.decision === "APPROVED" ? "Approve" : "Reject"} Leave Request
            </DialogTitle>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-3">
              <p className="text-sm">
                <strong>{reviewTarget.item.staff.firstName} {reviewTarget.item.staff.lastName}</strong> —
                {" "}{reviewTarget.item.type} leave ({reviewTarget.item.days} days)
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(reviewTarget.item.startDate)} to {formatDate(reviewTarget.item.endDate)}
              </p>
              {reviewTarget.decision === "REJECTED" && (
                <div>
                  <Label>Rejection Note (optional)</Label>
                  <Textarea
                    className="mt-1" rows={2}
                    placeholder="Reason for rejection…"
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)}>Cancel</Button>
            <Button
              variant={reviewTarget?.decision === "APPROVED" ? "default" : "destructive"}
              disabled={review.isPending}
              onClick={() => reviewTarget && review.mutate({
                id: reviewTarget.item.id,
                decision: reviewTarget.decision,
                note: rejectionNote || undefined,
              })}
            >
              {review.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {reviewTarget?.decision === "APPROVED" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
