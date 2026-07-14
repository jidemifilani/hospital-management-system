import type { Metadata } from "next";
import { Suspense } from "react";
import { PatientsTable } from "@/components/patients/patients-table";
import { PatientSearch } from "@/components/patients/patient-search";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Patients" };

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">Manage patient records and registrations.</p>
        </div>
        <Button asChild>
          <Link href="/patients/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Register Patient
          </Link>
        </Button>
      </div>
      <PatientSearch />
      <Suspense fallback={<div>Loading patients…</div>}>
        <PatientsTable />
      </Suspense>
    </div>
  );
}
