"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { api } from "@/lib/api-client";

interface StaffMember {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
  phone: string;
  isActive: boolean;
  department: { id: string; name: string; code: string } | null;
  user: { email: string; role: string; status: string } | null;
}

export function StaffTable() {
  const { data, isLoading } = useQuery<{ items: StaffMember[] }>({
    queryKey: ["staff"],
    queryFn: () => api.get("/staff?limit=50").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </Card>
    );
  }

  const staff = data?.items ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Specialization</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {staff.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No staff records found.
                </td>
              </tr>
            )}
            {staff.map((s) => {
              const name = `${s.firstName} ${s.lastName}`;
              return (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(name)}
                      </div>
                      <span className="font-medium">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.employeeId}</td>
                  <td className="px-4 py-3 capitalize">{s.user?.role?.replace("_", " ").toLowerCase() ?? "—"}</td>
                  <td className="px-4 py-3">{s.department?.name ?? "—"}</td>
                  <td className="px-4 py-3">{s.specialization ?? "—"}</td>
                  <td className="px-4 py-3">{s.phone}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.isActive ? "success" : "secondary"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
