"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = [
  "CONSULTATION","PROCEDURE","LAB","RADIOLOGY","PHARMACY","WARD","NURSING","OTHER",
];

const itemSchema = z.object({
  description: z.string().min(1, "Required"),
  category:    z.string().default("OTHER"),
  quantity:    z.coerce.number().min(1),
  unitPrice:   z.coerce.number().min(0),
});

const schema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  dueDate:   z.string().optional(),
  notes:     z.string().optional(),
  items:     z.array(itemSchema).min(1, "At least one item is required"),
});

type FormValues = z.infer<typeof schema>;

const NGN = (n: number) =>
  Number(n).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export function CreateInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [patientSearch, setPatientSearch] = useState("");

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ description: "", category: "CONSULTATION", quantity: 1, unitPrice: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");

  const subtotal = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

  const { data: patients = [] } = useQuery<{ id: string; firstName: string; lastName: string; mrn: string }[]>({
    queryKey: ["patients-search", patientSearch],
    queryFn: () =>
      api.get("/patients", { params: { search: patientSearch, limit: 10 } }).then((r) => r.data?.data ?? []),
    enabled: patientSearch.length > 1,
  });

  const save = useMutation({
    mutationFn: (data: FormValues) => api.post("/billing/invoices", data),
    onSuccess: () => {
      toast({ title: "Invoice created" });
      router.push("/billing");
    },
    onError: (e) => toast({ title: apiErrorMessage(e, "Failed to create invoice"), variant: "destructive" }),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/billing"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Invoice</h1>
          <p className="text-sm text-muted-foreground">Create a patient invoice for services rendered.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6">
        {/* Patient + dates */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Patient Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Patient *</Label>
              <Input
                placeholder="Search by name or MRN…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
              {patients.length > 0 && (
                <div className="rounded-lg border bg-card shadow-sm">
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => { setValue("patientId", p.id); setPatientSearch(`${p.firstName} ${p.lastName} (${p.mrn})`); }}
                    >
                      <span className="font-medium">{p.firstName} {p.lastName}</span>
                      <span className="ml-auto text-xs text-muted-foreground font-mono">{p.mrn}</span>
                    </button>
                  ))}
                </div>
              )}
              {errors.patientId && <p className="text-xs text-destructive">{errors.patientId.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Due Date (optional)</Label>
              <Input type="date" {...register("dueDate")} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input placeholder="Internal notes…" {...register("notes")} />
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ description: "", category: "OTHER", quantity: 1, unitPrice: 0 })}
            >
              <Plus className="mr-1 h-4 w-4" />Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4 space-y-1">
                  {idx === 0 && <Label className="text-xs">Description</Label>}
                  <Input placeholder="e.g. Consultation" {...register(`items.${idx}.description`)} />
                </div>
                <div className="col-span-3 space-y-1">
                  {idx === 0 && <Label className="text-xs">Category</Label>}
                  <Select
                    defaultValue="OTHER"
                    onValueChange={(v) => setValue(`items.${idx}.category`, v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  {idx === 0 && <Label className="text-xs">Qty</Label>}
                  <Input type="number" min={1} {...register(`items.${idx}.quantity`)} />
                </div>
                <div className="col-span-2 space-y-1">
                  {idx === 0 && <Label className="text-xs">Unit (₦)</Label>}
                  <Input type="number" min={0} step={0.01} {...register(`items.${idx}.unitPrice`)} />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {errors.items && typeof errors.items.message === "string" && (
              <p className="text-xs text-destructive">{errors.items.message}</p>
            )}

            <Separator />
            <div className="flex justify-end gap-6 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold text-lg">{NGN(subtotal)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/billing">Cancel</Link>
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}
