import type { Metadata } from "next";
import { Suspense } from "react";
import { LabDashboard } from "@/components/lab/lab-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Laboratory — CareSync HMS" };

export default function LabPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <LabDashboard />
    </Suspense>
  );
}
