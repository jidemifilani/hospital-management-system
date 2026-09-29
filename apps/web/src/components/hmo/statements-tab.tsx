"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Banknote } from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const naira = (v: string | number | null | undefined) =>
  `₦${Number(v ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ISSUED: "bg-blue-100 text-blue-700",
  PART_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  VOID: "bg-gray-100 text-gray-500",
};

const asDate = (d: string) => new Date(d).toLocaleDateString("en-NG");

function BuildStatementDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: payers = [] } = useQuery({
    queryKey: ["hmo-providers"],
    queryFn: async () => (await api.get("/hmo/providers")).data,
  });

  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [form, setForm] = useState({
    payerId: "",
    periodStart: firstOfMonth.toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
  });

  const build = useMutation({
    mutationFn: () =>
      api.post("/hmo/statements", {
        payerId: form.payerId,
        periodStart: new Date(form.periodStart).toISOString(),
        periodEnd: new Date(form.periodEnd).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hmo-statements"] });
      toast({ title: "Statement built" });
      onClose();
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not build it"), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Build a Statement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Payer *</Label>
            <Select value={form.payerId} onValueChange={(v) => setForm({ ...form, payerId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {payers.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="stm-from" className="text-xs">Period from *</Label>
              <Input id="stm-from" type="date" value={form.periodStart}
                onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="stm-to" className="text-xs">Period to *</Label>
              <Input id="stm-to" type="date" value={form.periodEnd}
                onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Gathers approved claims decided in that period which are not already on a
            statement. Claims still under review are left out — nobody has agreed what
            they are worth yet.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.payerId || build.isPending} onClick={() => build.mutate()}>
            {build.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Build
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Consolidated billing. A company on retainership gets one bill covering
 * everyone it pays for, rather than a claim per visit.
 */
export function StatementsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [building, setBuilding] = useState(false);

  const { data: statements = [] } = useQuery({
    queryKey: ["hmo-statements"],
    queryFn: async () => (await api.get("/hmo/statements")).data,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["hmo-statements"] });
    qc.invalidateQueries({ queryKey: ["hmo-claims"] });
    qc.invalidateQueries({ queryKey: ["hmo-statement"] });
  };

  const issue = useMutation({
    mutationFn: (id: string) => api.post(`/hmo/statements/${id}/issue`, {}),
    onSuccess: () => { refresh(); toast({ title: "Statement issued" }); },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not issue it"), variant: "destructive" }),
  });

  const pay = useMutation({
    mutationFn: (s: any) =>
      api.post(`/hmo/statements/${s.id}/payment`, { amount: Number(s.outstanding) }),
    onSuccess: () => {
      refresh();
      toast({
        title: "Payment recorded",
        description: "Allocated across the claims on the statement.",
      });
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Could not record it"), variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setBuilding(true)}>
          <FileText className="mr-2 h-4 w-4" /> Build Statement
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statement</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Claims</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No statements yet. Build one to bill a payer for a period.
                  </TableCell>
                </TableRow>
              )}
              {statements.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.statementNumber}</TableCell>
                  <TableCell className="text-sm">
                    {s.payer?.name}
                    <div className="text-xs text-muted-foreground">{s.payer?.type}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {asDate(s.periodStart)} – {asDate(s.periodEnd)}
                    {s.isOverdue && (
                      <div className="font-medium text-red-600">past its due date</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">{s.claimCount}</TableCell>
                  <TableCell className="text-right text-sm">{naira(s.totalApproved)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {naira(s.outstanding)}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLE[s.status] ?? ""}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {s.status === "DRAFT" && (
                      <Button size="sm" variant="outline" disabled={issue.isPending}
                        onClick={() => issue.mutate(s.id)}>
                        Issue
                      </Button>
                    )}
                    {["ISSUED", "PART_PAID"].includes(s.status) && (
                      <Button size="sm" variant="outline" disabled={pay.isPending}
                        onClick={() => pay.mutate(s)}>
                        <Banknote className="mr-1 h-3 w-3" /> Record Payment
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {building && <BuildStatementDialog onClose={() => setBuilding(false)} />}
    </div>
  );
}
