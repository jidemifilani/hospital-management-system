"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface ResultRow {
  testName: string;
  result: string;
  unit: string;
  normalRange: string;
  isAbnormal: boolean;
  isCritical: boolean;
  notes: string;
}

interface Props {
  orderId: string;
  existingTests: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const blank = (testName = ""): ResultRow => ({
  testName, result: "", unit: "", normalRange: "", isAbnormal: false, isCritical: false, notes: "",
});

export function AddResultsModal({ orderId, existingTests, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rows, setRows] = useState<ResultRow[]>(() =>
    existingTests.length ? existingTests.map((t) => blank(t)) : [blank()]
  );

  const update = (idx: number, field: keyof ResultRow, value: string | boolean) =>
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const save = useMutation({
    mutationFn: () =>
      api.post(`/lab/orders/${orderId}/results`, {
        results: rows
          .filter((r) => r.result.trim())
          .map((r) => ({
            testName: r.testName,
            result: r.result,
            unit: r.unit || undefined,
            normalRange: r.normalRange || undefined,
            isAbnormal: r.isAbnormal,
            isCritical: r.isCritical,
            notes: r.notes || undefined,
          })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-orders"] });
      toast({ title: "Results saved" });
      onSuccess();
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Failed to save results"), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enter Lab Results</DialogTitle>
          <p className="text-sm text-muted-foreground">Fill in results for each test. Leave blank to skip.</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {rows.map((row, idx) => (
            <div key={idx} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-1 mr-3">
                  <Label className="text-xs">Test Name</Label>
                  <Input
                    value={row.testName}
                    onChange={(e) => update(idx, "testName", e.target.value)}
                    placeholder="e.g. FBC — Haemoglobin"
                  />
                </div>
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-5 text-destructive"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Result *</Label>
                  <Input value={row.result} onChange={(e) => update(idx, "result", e.target.value)} placeholder="e.g. 12.5" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Input value={row.unit} onChange={(e) => update(idx, "unit", e.target.value)} placeholder="e.g. g/dL" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Normal Range</Label>
                  <Input value={row.normalRange} onChange={(e) => update(idx, "normalRange", e.target.value)} placeholder="e.g. 12–16" />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={row.isAbnormal}
                    onCheckedChange={(v) => update(idx, "isAbnormal", v)}
                    id={`abnormal-${idx}`}
                  />
                  <Label htmlFor={`abnormal-${idx}`} className="text-sm text-amber-700">Abnormal</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={row.isCritical}
                    onCheckedChange={(v) => { update(idx, "isCritical", v); if (v) update(idx, "isAbnormal", true); }}
                    id={`critical-${idx}`}
                  />
                  <Label htmlFor={`critical-${idx}`} className="text-sm text-red-700">Critical</Label>
                </div>
                <div className="flex-1 space-y-1">
                  <Input value={row.notes} onChange={(e) => update(idx, "notes", e.target.value)} placeholder="Notes (optional)" />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRows((prev) => [...prev, blank()])}
          >
            <Plus className="mr-2 h-4 w-4" />Add Test
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || rows.every((r) => !r.result.trim())}
          >
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Results
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
