"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, ShieldAlert, TriangleAlert } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface SafetyWarning {
  type: "ALLERGY" | "DUPLICATE_THERAPY" | "DUPLICATE_ORDER";
  severity: "WARNING" | "CRITICAL";
  message: string;
  subject: string;
  allergen?: string;
}

interface Item {
  drugItemId: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
}

const FREQUENCIES = ["OD", "BD", "TDS", "QDS", "PRN", "STAT", "NOCTE"];

const blankItem = (): Item => ({
  drugItemId: "",
  dosage: "",
  frequency: "BD",
  duration: "",
  quantity: 1,
});

/**
 * Shown when the API refuses a prescription on safety grounds. Critical
 * warnings require a deliberate second action rather than a single click,
 * and the override is recorded against the patient.
 */
function SafetyGate({
  warnings,
  onCancel,
  onOverride,
  pending,
}: {
  warnings: SafetyWarning[];
  onCancel: () => void;
  onOverride: () => void;
  pending: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const critical = warnings.filter((w) => w.severity === "CRITICAL");
  const advisory = warnings.filter((w) => w.severity !== "CRITICAL");

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-5 w-5" />
            Clinical safety check
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {critical.length > 0 && (
            <div className="space-y-2 rounded border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                Contraindication
              </p>
              {critical.map((w, i) => (
                <p key={i} className="text-sm text-red-900 dark:text-red-200">
                  {w.message}
                </p>
              ))}
            </div>
          )}

          {advisory.length > 0 && (
            <div className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                <TriangleAlert className="h-3 w-3" /> Advisory
              </p>
              {advisory.map((w, i) => (
                <p key={i} className="text-sm text-amber-900 dark:text-amber-200">
                  {w.message}
                </p>
              ))}
            </div>
          )}

          {critical.length > 0 && (
            <label className="flex cursor-pointer items-start gap-2 rounded border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                I have reviewed this contraindication and am prescribing deliberately. This
                decision will be recorded against the patient&apos;s record.
              </span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={(critical.length > 0 && !confirmed) || pending}
            onClick={onOverride}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Prescribe anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewPrescriptionDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [warnings, setWarnings] = useState<SafetyWarning[] | null>(null);

  const { data: patients } = useQuery({
    queryKey: ["patients-lookup", search],
    queryFn: async () => (await api.get("/patients", { params: { search, limit: 10 } })).data,
    enabled: search.length > 1,
  });

  const { data: drugs } = useQuery({
    queryKey: ["drug-catalogue"],
    queryFn: async () => (await api.get("/pharmacy/drugs", { params: { limit: 200 } })).data,
  });

  const submit = useMutation({
    mutationFn: (acknowledgeWarnings: boolean) =>
      api.post("/pharmacy/prescriptions", {
        patientId,
        notes: notes || undefined,
        items,
        ...(acknowledgeWarnings ? { acknowledgeWarnings: true } : {}),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      toast({
        title: "Prescription created",
        description: res.data?.prescriptionNo,
      });
      setWarnings(null);
      onClose();
    },
    onError: (e: Error) => {
      const found = e instanceof ApiError ? (e.data?.warnings as SafetyWarning[] | undefined) : undefined;
      if (found?.length) {
        setWarnings(found);
        return;
      }
      toast({ title: e.message, variant: "destructive" });
    },
  });

  const patientList = patients?.items ?? [];
  const drugList = drugs?.data ?? drugs ?? [];

  const setItem = (idx: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const valid =
    patientId &&
    items.length > 0 &&
    items.every((i) => i.drugItemId && i.dosage && i.frequency && i.duration && i.quantity > 0);

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Prescription</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Patient *</Label>
              <Input
                placeholder="Search by name, MRN or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {patientList.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded border">
                  {patientList.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPatientId(p.id);
                        setSearch(`${p.firstName} ${p.lastName} — ${p.mrn}`);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                        patientId === p.id ? "bg-muted font-medium" : ""
                      }`}
                    >
                      {p.firstName} {p.lastName} · {p.mrn}
                      {p.allergies && (
                        <span className="ml-2 text-xs text-red-600">allergies: {p.allergies}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Medications *</Label>
                <Button size="sm" variant="ghost" onClick={() => setItems([...items, blankItem()])}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add
                </Button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="space-y-2 rounded border p-3">
                  <div className="flex items-center gap-2">
                    <Select
                      value={item.drugItemId}
                      onValueChange={(v) => setItem(idx, { drugItemId: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select drug…" />
                      </SelectTrigger>
                      <SelectContent>
                        {drugList.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {items.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Dosage"
                      value={item.dosage}
                      onChange={(e) => setItem(idx, { dosage: e.target.value })}
                    />
                    <Select
                      value={item.frequency}
                      onValueChange={(v) => setItem(idx, { frequency: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Duration"
                      value={item.duration}
                      onChange={(e) => setItem(idx, { duration: e.target.value })}
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={!valid || submit.isPending} onClick={() => submit.mutate(false)}>
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Prescribe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {warnings && (
        <SafetyGate
          warnings={warnings}
          pending={submit.isPending}
          onCancel={() => setWarnings(null)}
          onOverride={() => submit.mutate(true)}
        />
      )}
    </>
  );
}
