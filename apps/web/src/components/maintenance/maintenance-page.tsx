"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, Plus, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const REQUEST_TYPES = ["CLEANING","PLUMBING","ELECTRICAL","HVAC","CARPENTRY","PAINTING","PEST_CONTROL","IT_SUPPORT","OTHER"];
const PRIORITIES = ["LOW","MEDIUM","HIGH","URGENT"];
const STATUSES = ["OPEN","ASSIGNED","IN_PROGRESS","COMPLETED","CANCELLED"];

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  ASSIGNED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-800",
};

export function MaintenancePage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [form, setForm] = useState({ type: "CLEANING", priority: "MEDIUM", location: "", description: "" });

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (priorityFilter !== "all") params.set("priority", priorityFilter);

  const { data: requests = [] } = useQuery({
    queryKey: ["maintenance", statusFilter, priorityFilter],
    queryFn: () => api.get(`/maintenance?${params}`).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["maintenance-summary"],
    queryFn: () => api.get("/maintenance/summary").then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["maintenance"] });
    qc.invalidateQueries({ queryKey: ["maintenance-summary"] });
  };

  const create = useMutation({
    mutationFn: (data: any) => api.post("/maintenance", data).then((r) => r.data),
    onSuccess: () => { invalidate(); setAddOpen(false); setForm({ type: "CLEANING", priority: "MEDIUM", location: "", description: "" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, notes }: any) => api.patch(`/maintenance/${id}/status`, { status, resolutionNotes: notes }).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); setResolutionNotes(""); },
  });

  const openSheet = (req: any) => { setSelected(req); setSheetOpen(true); setResolutionNotes(""); };

  const nextStatus: Record<string, string> = { OPEN: "ASSIGNED", ASSIGNED: "IN_PROGRESS", IN_PROGRESS: "COMPLETED" };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Requests</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Request</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Maintenance Request</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ward, room, floor…" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue…" />
              </div>
              <Button className="w-full" onClick={() => create.mutate(form)} disabled={create.isPending || !form.location || !form.description}>
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Open", value: summary.open, color: "text-yellow-600" },
            { label: "Assigned", value: summary.assigned, color: "text-blue-600" },
            { label: "In Progress", value: summary.inProgress, color: "text-purple-600" },
            { label: "Active Total", value: summary.total, color: "text-primary" },
            { label: "Urgent", value: summary.urgent, color: "text-red-600" },
            { label: "Completed", value: summary.completed, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3"><p className={`text-2xl font-bold ${color}`}>{value}</p></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No requests found</TableCell></TableRow>
            ) : requests.map((req: any) => (
              <TableRow key={req.id} className={req.priority === "URGENT" ? "bg-red-50/30 dark:bg-red-950/10" : ""}>
                <TableCell className="font-mono text-xs">{req.requestNumber}</TableCell>
                <TableCell>{req.type.replace("_", " ")}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {req.priority === "URGENT" && <AlertTriangle className="h-3 w-3 text-red-500" />}
                    <Badge className={priorityColors[req.priority] ?? ""}>{req.priority}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{req.location}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{req.description}</TableCell>
                <TableCell><Badge className={statusColors[req.status] ?? ""}>{req.status.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</TableCell>
                <TableCell className="text-sm">{req.assignedTo ? `${req.assignedTo.firstName} ${req.assignedTo.lastName}` : "—"}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => openSheet(req)}>View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[420px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  {selected.requestNumber}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{selected.type.replace("_", " ")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><Badge className={priorityColors[selected.priority] ?? ""}>{selected.priority}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[selected.status] ?? ""}>{selected.status.replace("_", " ")}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{selected.location}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Requested by</span><span>{selected.requestedBy?.firstName} {selected.requestedBy?.lastName}</span></div>
                  {selected.assignedTo && <div className="flex justify-between"><span className="text-muted-foreground">Assigned to</span><span>{selected.assignedTo.firstName} {selected.assignedTo.lastName}</span></div>}
                  {selected.resolvedAt && <div className="flex justify-between"><span className="text-muted-foreground">Resolved at</span><span>{format(new Date(selected.resolvedAt), "dd MMM yyyy HH:mm")}</span></div>}
                  <div className="pt-1 border-t"><p className="text-muted-foreground text-xs">Description</p><p className="mt-1">{selected.description}</p></div>
                  {selected.resolutionNotes && <div className="pt-1 border-t"><p className="text-muted-foreground text-xs">Resolution Notes</p><p className="mt-1">{selected.resolutionNotes}</p></div>}
                </div>

                {(() => {
                  const ns = nextStatus[selected.status];
                  if (!ns) return null;
                  return (
                    <div className="space-y-2 border rounded-lg p-4">
                      <p className="text-sm font-medium">Progress to: {ns.replace("_", " ")}</p>
                      {ns === "COMPLETED" && (
                        <Textarea rows={2} placeholder="Resolution notes…" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
                      )}
                      <Button className="w-full" size="sm" onClick={() => updateStatus.mutate({ id: selected.id, status: ns, notes: resolutionNotes })} disabled={updateStatus.isPending}>
                        Mark as {ns.replace("_", " ")}
                      </Button>
                    </div>
                  );
                })()}

                {!["COMPLETED", "CANCELLED"].includes(selected.status) && (
                  <Button variant="outline" className="w-full" size="sm" onClick={() => updateStatus.mutate({ id: selected.id, status: "CANCELLED", notes: "" })} disabled={updateStatus.isPending}>
                    Cancel Request
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
