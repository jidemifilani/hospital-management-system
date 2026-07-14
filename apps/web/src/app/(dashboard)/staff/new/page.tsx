import type { Metadata } from "next";
import { AddStaffForm } from "@/components/staff/add-staff-form";

export const metadata: Metadata = { title: "Add Staff Member" };

export default function NewStaffPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Staff Member</h1>
        <p className="text-muted-foreground">
          Create a staff account. The member can log in immediately and set their own MFA.
        </p>
      </div>
      <AddStaffForm />
    </div>
  );
}
