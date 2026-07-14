"use client";

import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  description:   z.string().min(3, "Required"),
  icdCode:       z.string().optional(),
  diagnosisType: z.enum(["PRIMARY", "SECONDARY", "DIFFERENTIAL"]).default("PRIMARY"),
  status:        z.enum(["ACTIVE", "RESOLVED", "CHRONIC", "RULED_OUT"]).default("ACTIVE"),
  notes:         z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  patientId: string;
  appointmentId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DiagnosisForm({ patientId, appointmentId, onSuccess, onCancel }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { diagnosisType: "PRIMARY", status: "ACTIVE" },
  });

  const save = useMutation({
    mutationFn: (data: unknown) => api.post("/emr/diagnoses", data),
    onSuccess: () => { toast({ title: "Diagnosis added" }); onSuccess(); },
    onError:   () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-base">Add Diagnosis</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => save.mutate({ ...v, patientId, appointmentId }))} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Description *</Label>
              <Input placeholder="e.g. Type 2 Diabetes Mellitus" {...register("description")} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>ICD Code</Label>
              <Input placeholder="e.g. E11" {...register("icdCode")} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select defaultValue="PRIMARY" onValueChange={(v) => setValue("diagnosisType", v as FormValues["diagnosisType"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["PRIMARY","SECONDARY","DIFFERENTIAL"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional clinical notes…" rows={2} {...register("notes")} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Diagnosis
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
