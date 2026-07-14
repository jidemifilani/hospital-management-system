"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, getInitials } from "@/lib/utils";
import { api } from "@/lib/api-client";

interface RecentPatient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  gender: string;
  phone: string;
  createdAt: string;
}

export function RecentPatients() {
  const { data = [], isError } = useQuery<RecentPatient[]>({
    queryKey: ["recent-patients"],
    queryFn: () => api.get("/dashboard/recent-patients").then((r) => r.data),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recently Registered</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isError && <p className="text-sm text-destructive">Failed to load patients.</p>}
        {!isError && data.length === 0 && (
          <p className="text-sm text-muted-foreground">No patients registered yet.</p>
        )}
        {data.map((patient) => {
          const name = `${patient.firstName} ${patient.lastName}`;
          return (
            <Link
              key={patient.id}
              href={`/patients/${patient.id}`}
              className="flex items-center gap-3 rounded-lg p-1 hover:bg-accent"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {patient.mrn} · {patient.gender}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">{formatDate(patient.createdAt)}</p>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
