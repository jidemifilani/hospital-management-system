import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingDashboard } from "@/components/billing/billing-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Billing — CareSync HMS" };

export default function BillingPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <BillingDashboard />
    </Suspense>
  );
}
