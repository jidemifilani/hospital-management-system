"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  temperature:      z.coerce.number().min(30).max(45).optional().or(z.literal("")),
  systolicBP:       z.coerce.number().min(50).max(250).optional().or(z.literal("")),
  diastolicBP:      z.coerce.number().min(30).max(150).optional().or(z.literal("")),
  heartRate:        z.coerce.number().min(20).max(300).optional().or(z.literal("")),
  respiratoryRate:  z.coerce.number().min(4).max(60).optional().or(z.literal("")),
  oxygenSaturation: z.coerce.number().min(50).max(100).optional().or(z.literal("")),
  weight:           z.coerce.number().min(0.5).max(400).optional().or(z.literal("")),
  height:           z.coerce.number().min(30).max(250).optional().or(z.literal("")),
  bloodGlucose:     z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  pain:             z.coerce.number().min(0).max(10).optional().or(z.literal("")),
  notes:            z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const FIELDS: { key: keyof FormValues; label: string; unit: string; step?: string }[] = [
  { key: "temperature",      label: "Temperature",       unit: "°C",      step: "0.1" },
  { key: "systolicBP",       label: "Systolic BP",       unit: "mmHg" },
  { key: "diastolicBP",      label: "Diastolic BP",      unit: "mmHg" },
  { key: "heartRate",        label: "Heart Rate",        unit: "bpm" },
  { key: "respiratoryRate",  label: "Respiratory Rate",  unit: "/min" },
  { key: "oxygenSaturation", label: "SpO₂",             unit: "%" },
  { key: "weight",           label: "Weight",            unit: "kg",      step: "0.1" },
  { key: "height",           label: "Height",            unit: "cm" },
  { key: "bloodGlucose",     label: "Blood Glucose",     unit: "mmol/L",  step: "0.1" },
  { key: "pain",             label: "Pain Score (0–10)", unit: "" },
];

interface Props {
  patientId: string;
  appointmentId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VitalsForm({ patientId, appointmentId, onSuccess, onCancel }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/emr/vitals", data),
    onSuccess: () => { toast({ title: "Vitals recorded" }); onSuccess(); },
    onError:   () => toast({ title: "Failed to save vitals", variant: "destructive" }),
  });

  function onSubmit(values: FormValues) {
    const clean: Record<string, unknown> = { patientId, appointmentId };
    for (const [k, v] of Object.entries(values)) {
      if (v !== "" && v !== undefined) clean[k] = Number(v);
    }
    if (values.notes) clean.notes = values.notes;
    save.mutate(clean);
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-base">Record Vital Signs</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {FIELDS.map(({ key, label, unit, step }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key} className="text-xs">{label}{unit ? ` (${unit})` : ""}</Label>
                <Input
                  id={key}
                  type="number"
                  step={step ?? "1"}
                  placeholder="—"
                  {...register(key)}
                  className="h-8 text-sm"
                />
                {errors[key] && <p className="text-xs text-destructive">{String(errors[key]?.message)}</p>}
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Input id="notes" placeholder="Additional observations…" {...register("notes")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Vitals
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
