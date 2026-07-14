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
import { GraduationCap, Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

const CATEGORIES = ["CLINICAL","SAFETY","COMPLIANCE","LEADERSHIP","TECHNICAL","OTHER"];
const STATUSES = ["SCHEDULED","IN_PROGRESS","COMPLETED","EXPIRED","CANCELLED"];

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  EXPIRED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-800",
};

export function TrainingPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({ score: "", certificationNumber: "", expiryDate: "", notes: "" });

  const [form, setForm] = useState({
    staffId: "", title: "", provider: "", category: "CLINICAL",
    type: "ELECTIVE", startDate: "", endDate: "", notes: "",
  });

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (categoryFilter !== "all") params.set("category", categoryFilter);
  if (typeFilter !== "all") params.set("type", typeFilter);

  const { data: records = [] } = useQuery({
    queryKey: ["training", statusFilter, categoryFilter, typeFilter],
    queryFn: () => api.get(`/training?${params}`).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["training-summary"],
    queryFn: () => api.get("/training/summary").then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["training"] });
    qc.invalidateQueries({ queryKey: ["training-summary"] });
  };

  const create = useMutation({
    mutationFn: (data: any) => api.post("/training", data).then((r) => r.data),
    onSuccess: () => { invalidate(); setAddOpen(false); setForm({ staffId: "", title: "", provider: "", category: "CLINICAL", type: "ELECTIVE", startDate: "", endDate: "", notes: "" }); },
  });

  const complete = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/training/${id}/complete`, data).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); setCompleteOpen(false); setCompleteForm({ score: "", certificationNumber: "", expiryDate: "", notes: "" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/training/${id}/status`, { status }).then((r) => r.data),
    onSuccess: (data) => { invalidate(); setSelected(data); },
  });

  const openSheet = (rec: any) => { setSelected(rec); setSheetOpen(true); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Staff Training & Certifications</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Training</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Schedule Training</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Staff ID</Label>
                  <Input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} placeholder="Staff ID" />
                </div>
                <div className="space-y-1">
                  <Label>Provider / Trainer</Label>
                  <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Organisation name" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Training Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. BLS Certification" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANDATORY">Mandatory</SelectItem>
                      <SelectItem value="ELECTIVE">Elective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>End Date</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button className="w-full" onClick={() => create.mutate(form)} disabled={create.isPending || !form.staffId || !form.title || !form.startDate}>
                Schedule Training
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Scheduled", value: summary.scheduled, color: "text-blue-600" },
            { label: "Completed", value: summary.completed, color: "text-green-600" },
            { label: "Mandatory Incomplete", value: summary.mandatory, color: "text-orange-600" },
            { label: "Certs Expiring (30d)", value: summary.expiringCerts, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  {(label.includes("Mandatory") || label.includes("Expiring")) && value > 0 && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                </div>
              </CardContent>
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="MANDATORY">Mandatory</SelectItem>
            <SelectItem value="ELECTIVE">Elective</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Training #</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cert Expiry</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No training records found</TableCell></TableRow>
            ) : records.map((rec: any) => {
              const expiring = rec.expiryDate && differenceInDays(new Date(rec.expiryDate), new Date()) <= 30;
              return (
                <TableRow key={rec.id} className={expiring ? "bg-orange-50/30 dark:bg-orange-950/10" : ""}>
                  <TableCell className="font-mono text-xs">{rec.trainingNumber}</TableCell>
                  <TableCell className="text-sm">{rec.staff ? `${rec.staff.firstName} ${rec.staff.lastName}` : "—"}</TableCell>
                  <TableCell className="font-medium">{rec.title}</TableCell>
                  <TableCell className="text-sm">{rec.category}</TableCell>
                  <TableCell>
                    <Badge variant={rec.type === "MANDATORY" ? "destructive" : "secondary"} className="text-xs">
                      {rec.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(rec.startDate), "dd MMM yyyy")}</TableCell>
                  <TableCell><Badge className={statusColors[rec.status] ?? ""}>{rec.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-sm">
                    {rec.expiryDate ? (
                      <span className={expiring ? "text-orange-600 font-medium" : ""}>
                        {format(new Date(rec.expiryDate), "dd MMM yyyy")}
                        {expiring && " ⚠"}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openSheet(rec)}>View</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[440px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {selected.trainingNumber}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Staff</span><span className="font-medium">{selected.staff ? `${selected.staff.firstName} ${selected.staff.lastName}` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span>{selected.staff?.department?.name ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Title</span><span className="font-medium">{selected.title}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span>{selected.provider ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{selected.category}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span>
                    <Badge variant={selected.type === "MANDATORY" ? "destructive" : "secondary"} className="text-xs">{selected.type}</Badge>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[selected.status] ?? ""}>{selected.status}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Start Date</span><span>{format(new Date(selected.startDate), "dd MMM yyyy")}</span></div>
                  {selected.endDate && <div className="flex justify-between"><span className="text-muted-foreground">End Date</span><span>{format(new Date(selected.endDate), "dd MMM yyyy")}</span></div>}
                  {selected.completedAt && <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span>{format(new Date(selected.completedAt), "dd MMM yyyy")}</span></div>}
                  {selected.score != null && <div className="flex justify-between"><span className="text-muted-foreground">Score</span><span>{selected.score}%</span></div>}
                  {selected.certificationNumber && <div className="flex justify-between"><span className="text-muted-foreground">Cert #</span><span className="font-mono">{selected.certificationNumber}</span></div>}
                  {selected.expiryDate && <div className="flex justify-between"><span className="text-muted-foreground">Cert Expiry</span><span className={differenceInDays(new Date(selected.expiryDate), new Date()) <= 30 ? "text-orange-600 font-medium" : ""}>{format(new Date(selected.expiryDate), "dd MMM yyyy")}</span></div>}
                  {selected.notes && <div className="pt-1 border-t"><p className="text-muted-foreground text-xs">Notes</p><p className="mt-1">{selected.notes}</p></div>}
                </div>

                {selected.status === "SCHEDULED" && (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => updateStatus.mutate({ id: selected.id, status: "IN_PROGRESS" })} disabled={updateStatus.isPending}>
                    Mark In Progress
                  </Button>
                )}

                {["SCHEDULED", "IN_PROGRESS"].includes(selected.status) && (
                  <>
                    <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full"><CheckCircle2 className="mr-2 h-4 w-4" />Mark Completed</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Complete Training</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>Score (%)</Label>
                              <Input type="number" min="0" max="100" value={completeForm.score} onChange={(e) => setCompleteForm({ ...completeForm, score: e.target.value })} placeholder="Optional" />
                            </div>
                            <div className="space-y-1">
                              <Label>Cert Number</Label>
                              <Input value={completeForm.certificationNumber} onChange={(e) => setCompleteForm({ ...completeForm, certificationNumber: e.target.value })} placeholder="Optional" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label>Certificate Expiry Date</Label>
                            <Input type="date" value={completeForm.expiryDate} onChange={(e) => setCompleteForm({ ...completeForm, expiryDate: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <Label>Notes</Label>
                            <Textarea rows={2} value={completeForm.notes} onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })} />
                          </div>
                          <Button className="w-full" onClick={() => complete.mutate({ id: selected.id, data: completeForm })} disabled={complete.isPending}>
                            Confirm Completion
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button variant="outline" size="sm" className="w-full" onClick={() => updateStatus.mutate({ id: selected.id, status: "CANCELLED" })} disabled={updateStatus.isPending}>
                      Cancel Training
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
