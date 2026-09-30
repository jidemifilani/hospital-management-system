"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";
import { PatientRegistrationForm } from "./patient-registration-form";

/**
 * Loads the patient before showing the form, so the fields start with what is
 * already on record rather than empty.
 */
export function PatientEditor({ patientId }: { patientId: string }) {
  const { data: patient, isLoading, error } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => (await api.get(`/patients/${patientId}`)).data,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {apiErrorMessage(error, "That patient could not be loaded.")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Edit {patient.firstName} {patient.lastName}
        </h1>
        <p className="font-mono text-sm text-muted-foreground">{patient.mrn}</p>
      </div>
      <PatientRegistrationForm patient={patient} />
    </div>
  );
}
