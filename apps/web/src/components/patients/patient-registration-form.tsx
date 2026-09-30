"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";

const patientSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  dateOfBirth: z.string().min(1, "Required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { required_error: "Select gender" }),
  phone: z.string().min(10, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  state: z.string().optional(),
  bloodGroup: z
    .enum(["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"])
    .optional(),
  allergies: z.string().optional(),
  emergencyContactName: z.string().min(1, "Required"),
  emergencyContactPhone: z.string().min(10, "Enter a valid phone number"),
  emergencyContactRelation: z.string().min(1, "Required"),
  ninNumber: z.string().optional(),
  nhisNumber: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

/**
 * Registers a patient, or edits one when an existing record is passed.
 *
 * The patients table has always offered an Edit action linking to
 * /patients/:id/edit, and that page did not exist — the link led to a 404. One
 * form serving both is better than a second copy that drifts from this one.
 */
export function PatientRegistrationForm({ patient }: { patient?: Record<string, any> } = {}) {
  const router = useRouter();
  const isEdit = Boolean(patient?.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    // Dates arrive as ISO timestamps but the inputs are type=date.
    defaultValues: patient
      ? ({
          ...patient,
          dateOfBirth: patient.dateOfBirth
            ? String(patient.dateOfBirth).slice(0, 10)
            : "",
        } as PatientFormValues)
      : undefined,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: PatientFormValues) =>
      isEdit
        ? api.patch(`/patients/${patient!.id}`, data).then((r) => r.data)
        : api.post("/patients", data).then((r) => r.data),
    onSuccess: (saved) => {
      toast.success(
        isEdit ? "Patient details updated" : `Patient registered — MRN: ${saved.mrn}`,
      );
      router.push(`/patients/${saved.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const field = (name: keyof PatientFormValues, label: string, props?: object) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} {...register(name)} {...props} />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field("firstName", "First Name")}
          {field("lastName", "Last Name")}
          {field("dateOfBirth", "Date of Birth", { type: "date" })}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              {...register("gender")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
          </div>
          {field("phone", "Phone Number", { type: "tel", placeholder: "0801 234 5678" })}
          {field("email", "Email Address (optional)", { type: "email" })}
          {field("address", "Address")}
          {field("state", "State")}
          <div className="space-y-2">
            <Label htmlFor="bloodGroup">Blood Group</Label>
            <select
              id="bloodGroup"
              {...register("bloodGroup")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Unknown</option>
              {["A_POS","A_NEG","B_POS","B_NEG","AB_POS","AB_NEG","O_POS","O_NEG"].map((bg) => (
                <option key={bg} value={bg}>{bg.replace("_", " ").replace("POS","+").replace("NEG","−")}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="allergies">Known Allergies</Label>
            <Input id="allergies" {...register("allergies")} placeholder="e.g. Penicillin, Sulfa drugs" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Emergency Contact</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {field("emergencyContactName", "Contact Name")}
          {field("emergencyContactPhone", "Contact Phone", { type: "tel" })}
          {field("emergencyContactRelation", "Relationship")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Identity & Insurance</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field("ninNumber", "NIN (optional)")}
          {field("nhisNumber", "NHIS Number (optional)")}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Register Patient"}
        </Button>
      </div>
    </form>
  );
}
