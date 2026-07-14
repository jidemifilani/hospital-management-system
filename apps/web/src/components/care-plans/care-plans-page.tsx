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
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Plus, ClipboardList, CheckCircle, XCircle, ListTodo, CheckSquare, Square } from "lucide-react";
import { format } from "date-fns";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    COMPLETED: "bg-blue-100 text-blue-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function taskStatusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    SKIPPED: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function CreatePlanDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", title: "", goals: "", startDate: "", endDate: "", notes: "" });
  const [tasks, setTasks] = useState([{ description: "", frequency: "" }]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/care-plans", data).then((r) => r.data),
    onSuccess: () => {
      setOpen(false);
      setForm({ patientId: "", title: "", goals: "", startDate: "", endDate: "", notes: "" });
      setTasks([{ description: "", frequency: "" }]);
      onSuccess();
    },
  });

  const addTask = () => setTasks([...tasks, { description: "", frequency: "" }]);
  const updateTask = (i: number, k: string, v: string) => {
    const next = [...tasks];
    (next[i] as any)[k] = v;
    setTasks(next);
  };
  const removeTask = (i: number) => setTasks(tasks.filter((_, idx) => idx !== i));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Care Plan</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create Nursing Care Plan</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label>Patient ID</Label>
            <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Plan Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Post-op Care Plan" />
          </div>
          <div className="space-y-1">
            <Label>Goals</Label>
            <Textarea value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} type="date" />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} type="date" />
            </div>
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Tasks</p>
              <Button size="sm" variant="outline" onClick={addTask} className="h-7 px-2 text-xs">+ Add Task</Button>
            </div>
            {tasks.map((t, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input value={t.description} onChange={(e) => updateTask(i, "description", e.target.value)} placeholder="Task description" className="flex-1" />
                <Input value={t.frequency} onChange={(e) => updateTask(i, "frequency", e.target.value)} placeholder="Freq. (e.g. 4-hourly)" className="w-36" />
                {tasks.length > 1 && (
                  <Button size="sm" variant="ghost" className="h-10 px-2 text-red-500" onClick={() => removeTask(i)}>✕</Button>
                )}
              </div>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={!form.patientId || !form.title || mutation.isPending}
            onClick={() => mutation.mutate({ ...form, tasks: tasks.filter((t) => t.description) })}
          >
            {mutation.isPending ? "Creating..." : "Create Care Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlanDetailSheet({ plan, onSuccess }: { plan: any; onSuccess: () => void }) {
  const qc = useQueryClient();

  const updateTask = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      api.patch(`/care-plans/tasks/${taskId}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["care-plans"] }); onSuccess(); },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/care-plans/${plan.id}/status`, { status }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["care-plans"] }); onSuccess(); },
  });

  const addTask = useMutation({
    mutationFn: (data: any) => api.post(`/care-plans/${plan.id}/tasks`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["care-plans"] }); onSuccess(); },
  });

  const [newTask, setNewTask] = useState("");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2">View</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{plan.planNumber} — {plan.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            {statusBadge(plan.status)}
            <span className="text-sm text-muted-foreground">
              Patient: {plan.patient ? `${plan.patient.firstName} ${plan.patient.lastName}` : "—"}
            </span>
          </div>
          {plan.goals && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Goals</p>
              <p className="text-sm">{plan.goals}</p>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Tasks ({plan.tasks?.length ?? 0})</p>
            </div>
            <div className="space-y-2">
              {(plan.tasks ?? []).map((t: any) => (
                <div key={t.id} className="flex items-start gap-2 rounded-lg border p-2">
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary"
                    onClick={() => updateTask.mutate({ taskId: t.id, data: { status: t.status === "COMPLETED" ? "PENDING" : "COMPLETED" } })}
                  >
                    {t.status === "COMPLETED"
                      ? <CheckSquare className="h-4 w-4 text-green-600" />
                      : <Square className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}>{t.description}</p>
                    {t.frequency && <p className="text-xs text-muted-foreground">{t.frequency}</p>}
                  </div>
                  {taskStatusBadge(t.status)}
                </div>
              ))}
            </div>
            {plan.status === "ACTIVE" && (
              <div className="flex gap-2 mt-3">
                <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add task..." className="flex-1" />
                <Button
                  size="sm"
                  disabled={!newTask || addTask.isPending}
                  onClick={() => { addTask.mutate({ description: newTask }); setNewTask(""); }}
                >Add</Button>
              </div>
            )}
          </div>
          {plan.status === "ACTIVE" && (
            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" className="flex-1" onClick={() => updateStatus.mutate("COMPLETED")}>
                <CheckCircle className="mr-2 h-4 w-4" />Mark Complete
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={() => updateStatus.mutate("CANCELLED")}>
                <XCircle className="mr-2 h-4 w-4" />Cancel
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function CarePlansPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const { data: summary } = useQuery({
    queryKey: ["care-plans-summary"],
    queryFn: () => api.get("/care-plans/summary").then((r) => r.data),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["care-plans", statusFilter],
    queryFn: () => api.get("/care-plans", { params: statusFilter !== "ALL" ? { status: statusFilter } : {} }).then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["care-plans"] });
    qc.invalidateQueries({ queryKey: ["care-plans-summary"] });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nursing Care Plans</h1>
          <p className="text-muted-foreground">Patient care plans and nursing tasks</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <ClipboardList className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.active ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{summary?.pendingTasks ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.completed ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.cancelled ?? 0}</div></CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <CreatePlanDialog onSuccess={invalidate} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-full text-center py-8">No care plans found</p>
          )}
          {plans.map((p: any) => {
            const tasks = p.tasks ?? [];
            const completed = tasks.filter((t: any) => t.status === "COMPLETED").length;
            return (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{p.planNumber}</p>
                      <h3 className="font-semibold mt-0.5">{p.title}</h3>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {p.patient ? `${p.patient.firstName} ${p.patient.lastName} (${p.patient.mrn})` : "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Nurse: {p.nurse ? `${p.nurse.firstName} ${p.nurse.lastName}` : "—"}
                  </p>
                  {tasks.length > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Tasks</span>
                        <span>{completed}/{tasks.length} done</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden relative">
                        <div
                          className="h-full bg-green-500 rounded-full absolute left-0 top-0"
                          style={{ width: `${tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Started {format(new Date(p.startDate), "dd MMM yyyy")}
                    {p.endDate ? ` → ${format(new Date(p.endDate), "dd MMM yyyy")}` : ""}
                  </p>
                  <PlanDetailSheet plan={p} onSuccess={invalidate} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
