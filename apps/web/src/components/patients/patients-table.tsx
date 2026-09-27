"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Eye, Edit, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, getInitials } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { exportToCsv } from "@/lib/csv-export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  bloodGroup: string | null;
  isActive: boolean;
}

export function PatientsTable() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const { data, isLoading } = useQuery<{ data: Patient[]; total: number; pages: number }>({
    queryKey: ["patients", q, page],
    queryFn: () =>
      api
        .get("/patients", { params: { q, page, limit: 20 } })
        .then((r) => r.data),
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

  const patients = data?.data ?? [];

  function handleExport() {
    exportToCsv(
      "patients",
      patients.map((p) => ({
        MRN: p.mrn,
        "First Name": p.firstName,
        "Last Name": p.lastName,
        "Date of Birth": formatDate(p.dateOfBirth),
        Gender: p.gender,
        Phone: p.phone,
        "Blood Group": p.bloodGroup ?? "",
        Status: p.isActive ? "Active" : "Inactive",
      })),
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <p className="text-xs text-muted-foreground">{data?.total ?? 0} patient{(data?.total ?? 0) !== 1 ? "s" : ""}</p>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleExport} disabled={patients.length === 0}>
          <Download className="h-3 w-3" />Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patient</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">MRN</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">DOB / Age</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gender</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Blood</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {patients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No patients found.
                </td>
              </tr>
            )}
            {patients.map((p) => {
              const name = `${p.firstName} ${p.lastName}`;
              const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(name)}
                      </div>
                      <span className="font-medium">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.mrn}</td>
                  <td className="px-4 py-3">{formatDate(p.dateOfBirth)} ({age}y)</td>
                  <td className="px-4 py-3 capitalize">{p.gender.toLowerCase()}</td>
                  <td className="px-4 py-3">{p.phone}</td>
                  <td className="px-4 py-3">{p.bloodGroup ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.isActive ? "success" : "secondary"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/patients/${p.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Record
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/patients/${p.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(data?.pages ?? 0) > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {page} of {data?.pages}
          </p>
        </div>
      )}
    </Card>
  );
}
