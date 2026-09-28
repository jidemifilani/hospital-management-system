"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LifeBuoy, Loader2, Plus, AlertTriangle, Clock, MessageSquare, CheckCircle2,
  RotateCcw, Lock,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CATEGORIES = [
  "CLEANING", "PLUMBING", "ELECTRICAL", "HVAC", "CARPENTRY", "PAINTING",
  "PEST_CONTROL", "IT_SUPPORT", "MEDICAL_EQUIPMENT", "SECURITY", "OTHER",
];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TEAMS = ["FACILITIES", "HOUSEKEEPING", "IT", "BIOMEDICAL", "SECURITY", "GENERAL"];

const pretty = (v: string) =>
  v.replace(/_/g, " ").toLowerCase().replace(/^./, (m) => m.toUpperCase());

const PRIORITY_STYLE: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  LOW: "bg-slate-100 text-slate-700",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-slate-100 text-slate-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  ON_HOLD: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-teal-100 text-teal-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

/** "in 3h" / "4h late" — a bare timestamp makes nobody act. */
function dueLabel(minutes: number | null) {
  if (minutes === null) return null;
  const abs = Math.abs(minutes);
  const text = abs < 60 ? `${abs}m` : abs < 1440 ? `${Math.round(abs / 60)}h` : `${Math.round(abs / 1440)}d`;
  return minutes < 0 ? `${text} late` : `in ${text}`;
}

function NewTicketDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "", description: "", category: "OTHER", location: "",
    priority: "MEDIUM", team: "",
  });

  const create = useMutation({
    mutationFn: () =>
      api.post("/helpdesk", {
        title: form.title,
        description: form.description,
        category: form.category,
        location: form.location,
        priority: form.priority,
        ...(form.team ? { team: form.team } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket-summary"] });
      toast({ title: "Ticket raised" });
      onClose();
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not raise the ticket"), variant: "destructive" }),
  });

  const target = { URGENT: "4 hours", HIGH: "24 hours", MEDIUM: "3 days", LOW: "7 days" }[form.priority];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Raise a Ticket</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="tk-title" className="text-xs">What is wrong? *</Label>
            <Input id="tk-title" placeholder="Ventilator alarming in ICU" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tk-desc" className="text-xs">Details *</Label>
            <Textarea id="tk-desc" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tk-loc" className="text-xs">Where *</Label>
            <Input id="tk-loc" placeholder="Ward B, bed 4" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              Be specific — nobody can attend &quot;the hospital&quot;.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{pretty(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{pretty(p)}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Target: fixed within {target}.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.title || !form.description || !form.location || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Raise Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketDialog({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [resolution, setResolution] = useState("");
  const [reopenReason, setReopenReason] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => (await api.get(`/helpdesk/${ticketId}`)).data,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    qc.invalidateQueries({ queryKey: ["tickets"] });
    qc.invalidateQueries({ queryKey: ["ticket-summary"] });
  };

  const comment = useMutation({
    mutationFn: () => api.post(`/helpdesk/${ticketId}/comments`, { body: reply, isInternal: internal }),
    onSuccess: () => { setReply(""); refresh(); },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not add the comment"), variant: "destructive" }),
  });

  const resolve = useMutation({
    mutationFn: () =>
      api.patch(`/helpdesk/${ticketId}/status`, { status: "RESOLVED", resolutionNotes: resolution }),
    onSuccess: () => { setResolution(""); refresh(); toast({ title: "Ticket resolved" }); },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not resolve"), variant: "destructive" }),
  });

  const reopen = useMutation({
    mutationFn: () => api.post(`/helpdesk/${ticketId}/reopen`, { reason: reopenReason }),
    onSuccess: () => { setReopenReason(""); refresh(); toast({ title: "Ticket reopened" }); },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not reopen"), variant: "destructive" }),
  });

  const settled = ticket && ["RESOLVED", "CLOSED"].includes(ticket.status);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {isLoading || !ticket ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{ticket.ticketNumber}</span>
                {ticket.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={STATUS_STYLE[ticket.status]}>{pretty(ticket.status)}</Badge>
                <Badge className={PRIORITY_STYLE[ticket.priority]}>{pretty(ticket.priority)}</Badge>
                <Badge variant="outline">{pretty(ticket.team)}</Badge>
                <Badge variant="outline">{pretty(ticket.category)}</Badge>
                {ticket.sla.resolutionOverdue && (
                  <Badge className="bg-red-100 text-red-700">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Past its target
                  </Badge>
                )}
                {ticket.reopenCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-800">
                    Reopened {ticket.reopenCount}×
                  </Badge>
                )}
              </div>

              <div className="rounded border bg-muted/40 p-3 text-sm">
                <p>{ticket.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {ticket.location} · raised by {ticket.requestedBy?.firstName}{" "}
                  {ticket.requestedBy?.lastName} ·{" "}
                  {new Date(ticket.createdAt).toLocaleString("en-NG")}
                  {ticket.assignedTo && ` · assigned to ${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`}
                </p>
                {!ticket.firstRespondedAt && !settled && (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    Nobody has replied to this yet.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Conversation</p>
                {(ticket.comments ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nothing said yet.</p>
                )}
                {(ticket.comments ?? []).map((c: any) => (
                  <div key={c.id}
                    className={`rounded border p-2 text-sm ${c.isInternal ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : ""}`}>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {c.author ? `${c.author.firstName} ${c.author.lastName}` : "System"}
                      {" · "}
                      {new Date(c.createdAt).toLocaleString("en-NG")}
                      {c.isInternal && (
                        <span className="flex items-center gap-1 font-medium text-amber-700">
                          <Lock className="h-3 w-3" /> internal
                        </span>
                      )}
                    </div>
                    <p className="mt-1">{c.body}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tk-reply" className="text-xs">Reply</Label>
                <Textarea id="tk-reply" rows={2} value={reply}
                  onChange={(e) => setReply(e.target.value)} />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={internal}
                    onChange={(e) => setInternal(e.target.checked)} />
                  Internal note — not shown to whoever raised this, and does not
                  count as replying to them
                </label>
                <Button size="sm" disabled={!reply.trim() || comment.isPending}
                  onClick={() => comment.mutate()}>
                  <MessageSquare className="mr-2 h-3 w-3" /> Add
                </Button>
              </div>

              {!settled ? (
                <div className="space-y-2 border-t pt-3">
                  <Label htmlFor="tk-res" className="text-xs">Resolution *</Label>
                  <Input id="tk-res" placeholder="What was done?" value={resolution}
                    onChange={(e) => setResolution(e.target.value)} />
                  <Button size="sm" disabled={!resolution.trim() || resolve.isPending}
                    onClick={() => resolve.mutate()}>
                    <CheckCircle2 className="mr-2 h-3 w-3" /> Mark Resolved
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 border-t pt-3">
                  {ticket.resolutionNotes && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Resolution: </span>
                      {ticket.resolutionNotes}
                    </p>
                  )}
                  <Label htmlFor="tk-reopen" className="text-xs">Not actually fixed?</Label>
                  <Input id="tk-reopen" placeholder="Why is it back?" value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)} />
                  <Button size="sm" variant="outline"
                    disabled={!reopenReason.trim() || reopen.isPending}
                    onClick={() => reopen.mutate()}>
                    <RotateCcw className="mr-2 h-3 w-3" /> Reopen
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HelpdeskPage() {
  const [creating, setCreating] = useState(false);
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const [team, setTeam] = useState("ALL");
  const [tab, setTab] = useState("open");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", team, tab],
    queryFn: async () =>
      (await api.get("/helpdesk", {
        params: {
          ...(team !== "ALL" ? { team } : {}),
          ...(tab === "overdue" ? { overdueOnly: "true" } : {}),
        },
      })).data,
  });

  const { data: summary } = useQuery({
    queryKey: ["ticket-summary"],
    queryFn: async () => (await api.get("/helpdesk/summary")).data,
  });

  const visible = tab === "open"
    ? tickets.filter((t: any) => !["RESOLVED", "CLOSED", "CANCELLED"].includes(t.status))
    : tickets;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <LifeBuoy className="h-6 w-6" /> Helpdesk
          </h1>
          <p className="text-sm text-muted-foreground">
            Faults and requests — facilities, IT, biomedical and housekeeping.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> Raise Ticket
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        {[
          { label: "Open", value: summary?.open ?? 0 },
          { label: "Past Target", value: summary?.overdue ?? 0, alert: (summary?.overdue ?? 0) > 0 },
          { label: "No Reply Yet", value: summary?.awaitingFirstReply ?? 0, alert: (summary?.awaitingFirstReply ?? 0) > 0 },
          {
            label: "Avg First Reply",
            value: summary?.averageFirstResponseMinutes === null || summary?.averageFirstResponseMinutes === undefined
              ? "—"
              : dueLabel(Math.abs(summary.averageFirstResponseMinutes))?.replace("in ", "") ?? "—",
          },
          { label: "Met Target", value: summary?.slaAttainment === null || summary?.slaAttainment === undefined ? "—" : `${summary.slaAttainment}%` },
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="overdue">Past Target</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All teams</SelectItem>
              {TEAMS.map((t) => <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Replies</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          Nothing here.
                        </TableCell>
                      </TableRow>
                    )}
                    {visible.map((t: any) => (
                      <TableRow key={t.id} className="cursor-pointer"
                        onClick={() => setOpenTicket(t.id)}>
                        <TableCell>
                          <div className="text-sm font-medium">{t.title}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {t.ticketNumber} · {t.location}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{pretty(t.team)}</TableCell>
                        <TableCell>
                          <Badge className={PRIORITY_STYLE[t.priority]}>{pretty(t.priority)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_STYLE[t.status]}>{pretty(t.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.sla.resolutionOverdue ? (
                            <span className="flex items-center gap-1 font-medium text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              {dueLabel(t.sla.minutesToResolve) ?? "past target"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {dueLabel(t.sla.minutesToResolve) ?? "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {t._count?.comments ?? 0}
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

      {creating && <NewTicketDialog onClose={() => setCreating(false)} />}
      {openTicket && <TicketDialog ticketId={openTicket} onClose={() => setOpenTicket(null)} />}
    </div>
  );
}
