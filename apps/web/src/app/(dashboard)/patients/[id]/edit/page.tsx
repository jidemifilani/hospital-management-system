import { PatientEditor } from "@/components/patients/patient-editor";

export const metadata = { title: "Edit Patient | CareSync HMS" };

export default function EditPatient({ params }: { params: { id: string } }) {
  return <PatientEditor patientId={params.id} />;
}
