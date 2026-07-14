import type { Metadata } from "next";
import { Suspense } from "react";
import { DepartmentsGrid } from "@/components/departments/departments-grid";

export const metadata: Metadata = { title: "Departments" };

export default function DepartmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
        <p className="text-muted-foreground">Hospital departments, staff counts, and bed availability.</p>
      </div>
      <Suspense fallback={<div>Loading departments…</div>}>
        <DepartmentsGrid />
      </Suspense>
    </div>
  );
}
