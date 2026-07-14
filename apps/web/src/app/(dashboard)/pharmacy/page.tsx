import type { Metadata } from "next";
import { Suspense } from "react";
import { PharmacyDashboard } from "@/components/pharmacy/pharmacy-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Pharmacy — CareSync HMS" };

export default function PharmacyPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <PharmacyDashboard />
    </Suspense>
  );
}
