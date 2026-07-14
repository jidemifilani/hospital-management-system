"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";

const staffSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain a number"),
  role: z.enum([
    "DOCTOR",
    "NURSE",
    "LAB_TECHNOLOGIST",
    "RADIOLOGIST",
    "PHARMACIST",
    "CASHIER",
    "RECEPTIONIST",
    "HR_OFFICER",
    "DEPARTMENT_HEAD",
    "HOSPITAL_ADMIN",
    "AUDITOR",
  ]),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  phone: z.string().min(10, "Enter a valid phone number"),
  departmentId: z.string().min(1, "Select a department"),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  organizationId: z.string().optional(),
});

type FormValues = z.infer<typeof staffSchema>;

const ROLES = [
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
  { value: "LAB_TECHNOLOGIST", label: "Lab Technologist" },
  { value: "RADIOLOGIST", label: "Radiologist" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "CASHIER", label: "Cashier" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "HR_OFFICER", label: "HR Officer" },
  { value: "DEPARTMENT_HEAD", label: "Department Head" },
  { value: "HOSPITAL_ADMIN", label: "Hospital Admin" },
  { value: "AUDITOR", label: "Auditor (Read-Only)" },
];

const CLINICAL_ROLES = ["DOCTOR", "NURSE", "LAB_TECHNOLOGIST", "RADIOLOGIST", "PHARMACIST", "DEPARTMENT_HEAD"];

export function AddStaffForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["departments"],
    queryFn: () => api.get("/departments").then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(staffSchema) });

  const selectedRole = watch("role");
  const isClinical = CLINICAL_ROLES.includes(selectedRole);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.post("/users", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Staff member added successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      if (onSuccess) onSuccess();
      else router.push("/staff");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Email Address *</Label>
            <Input type="email" placeholder="staff@hospital.ng" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Temporary Password *</Label>
            <Input type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" {...register("password")} />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Role *</Label>
            <Select onValueChange={(v) => setValue("role", v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>First Name *</Label>
            <Input placeholder="Chidi" {...register("firstName")} />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Last Name *</Label>
            <Input placeholder="Okafor" {...register("lastName")} />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Phone Number *</Label>
            <Input placeholder="+234 800 000 0000" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Department *</Label>
            <Select onValueChange={(v) => setValue("departmentId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.departmentId && (
              <p className="text-xs text-destructive">{errors.departmentId.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {isClinical && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinical Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Specialization</Label>
              <Input placeholder="e.g. Cardiology, General Medicine" {...register("specialization")} />
            </div>
            <div className="space-y-1.5">
              <Label>License Number</Label>
              <Input placeholder="e.g. MDCN-12345" {...register("licenseNumber")} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Staff Member
        </Button>
      </div>
    </form>
  );
}
