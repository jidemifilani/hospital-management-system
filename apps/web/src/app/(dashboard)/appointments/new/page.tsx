import type { Metadata } from "next";
import { BookAppointmentForm } from "@/components/appointments/book-appointment-form";

export const metadata: Metadata = { title: "Book Appointment" };

interface Props {
  searchParams: { patientId?: string };
}

export default function NewAppointmentPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Book Appointment</h1>
        <p className="text-muted-foreground">Schedule a new patient appointment.</p>
      </div>
      <BookAppointmentForm defaultPatientId={searchParams.patientId} />
    </div>
  );
}
