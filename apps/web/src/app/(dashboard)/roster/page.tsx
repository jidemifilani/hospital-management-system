import type { Metadata } from "next";
import { Suspense } from "react";
import { RosterPage } from "@/components/roster/roster-page";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Staff Roster — CareSync HMS" };

export default function RosterRoute() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <RosterPage />
    </Suspense>
  );
}
