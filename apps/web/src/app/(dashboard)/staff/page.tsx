import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffTable } from "@/components/staff/staff-table";
import { Button } from "@/components/ui/button";
import { UserCog } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Staff" };

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">Manage doctors, nurses and support staff.</p>
        </div>
        <Button asChild>
          <Link href="/staff/new">
            <UserCog className="mr-2 h-4 w-4" />
            Add Staff Member
          </Link>
        </Button>
      </div>
      <Suspense fallback={<div>Loading staff…</div>}>
        <StaffTable />
      </Suspense>
    </div>
  );
}
