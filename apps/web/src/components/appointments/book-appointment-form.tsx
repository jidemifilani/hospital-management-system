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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";

const appointmentSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  doctorId: z.string().min(1, "Select a doctor"),
  departmentId: z.string().min(1, "Select a department"),
  scheduledAt: z.string().min(1, "Select date and time"),
  durationMinutes: z.coerce.number().min(10).default(30),
  type: z.enum([
    "CONSULTATION",
    "FOLLOW_UP",
    "PROCEDURE",
    "LAB_TEST",
    "IMAGING",
    "TELEMEDICINE",
    "EMERGENCY",
  ]),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
  isTelemedicine: z.boolean().default(false),
});

type FormValues = z.infer<typeof appointmentSchema>;

const APPOINTMENT_TYPES = [
  { value: "CONSULTATION", label: "Consultation" },
  { value: "FOLLOW_UP", label: "Follow-Up" },
  { value: "PROCEDURE", label: "Procedure" },
  { value: "LAB_TEST", label: "Lab Test" },
  { value: "IMAGING", label: "Imaging" },
  { value: "TELEMEDICINE", label: "Telemedicine" },
  { value: "EMERGENCY", label: "Emergency" },
];

const DURATIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
];

export function BookAppointmentForm({ defaultPatientId }: { defaultPatientId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["departments"],
    queryFn: () => api.get("/departments").then((r) => r.data),
  });

  const { data: doctors = [] } = useQuery<
    { id: string; firstName: string; lastName: string; specialization: string | null }[]
  >({
    queryKey: ["doctors"],
    queryFn: () => api.get("/staff/doctors").then((r) => r.data),
  });

  const { data: patientsData } = useQuery<{
    data: { id: string; mrn: string; firstName: string; lastName: string }[];
  }>({
    queryKey: ["patients-list"],
    queryFn: () => api.get("/patients?limit=100").then((r) => r.data),
  });
  const patients = patientsData?.data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { durationMinutes: 30, isTelemedicine: false, patientId: defaultPatientId ?? "" },
  });

  const selectedType = watch("type");

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.post("/appointments", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Appointment booked successfully");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      router.push("/appointments");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient & Doctor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Patient *</Label>
            <Select onValueChange={(v) => setValue("patientId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Search and select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} — {p.mrn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.patientId && (
              <p className="text-xs text-destructive">{errors.patientId.message}</p>
            )}
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

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Doctor *</Label>
            <Select onValueChange={(v) => setValue("doctorId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    Dr. {d.firstName} {d.lastName}
                    {d.specialization ? ` — ${d.specialization}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.doctorId && (
              <p className="text-xs text-destructive">{errors.doctorId.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Date & Time *</Label>
            <Input
              type="datetime-local"
              {...register("scheduledAt")}
              min={new Date().toISOString().slice(0, 16)}
            />
            {errors.scheduledAt && (
              <p className="text-xs text-destructive">{errors.scheduledAt.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Duration</Label>
            <Select
              defaultValue="30"
              onValueChange={(v) => setValue("durationMinutes", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Appointment Type *</Label>
            <Select onValueChange={(v) => setValue("type", v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>

          {selectedType === "TELEMEDICINE" && (
            <input type="hidden" {...register("isTelemedicine")} value="true" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clinical Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Chief Complaint</Label>
            <Input
              placeholder="Reason for visit…"
              {...register("chiefComplaint")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional information for the doctor…"
              rows={3}
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Book Appointment
        </Button>
      </div>
    </form>
  );
}
