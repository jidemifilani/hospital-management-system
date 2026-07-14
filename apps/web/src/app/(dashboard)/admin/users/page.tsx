import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersTable } from "@/components/admin/users-table";
import { AddUserButton } from "@/components/admin/add-user-button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "User Management — CareSync HMS" };

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff accounts, roles, and access permissions.
          </p>
        </div>
        <AddUserButton />
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <UsersTable />
      </Suspense>
    </div>
  );
}
