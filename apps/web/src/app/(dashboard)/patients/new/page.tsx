import type { Metadata } from "next";
import { PatientRegistrationForm } from "@/components/patients/patient-registration-form";

export const metadata: Metadata = { title: "Register Patient" };

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Register New Patient</h1>
        <p className="text-muted-foreground">Fill in the patient&apos;s demographic and contact information.</p>
      </div>
      <PatientRegistrationForm />
    </div>
  );
}
