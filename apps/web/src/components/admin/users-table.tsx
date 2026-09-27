"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  email: string;
  role: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  mfaEnabled: boolean;
  createdAt: string;
  staff: { firstName: string; lastName: string; employeeId: string } | null;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  SUSPENDED: "destructive",
};

export function UsersTable() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ data: User[]; total: number }>({
    queryKey: ["users", search],
    queryFn: () =>
      api.get("/users", { params: { search, limit: 50 } }).then((r) => r.data),
  });

  const suspend = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/status`, { status: "SUSPENDED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User suspended" });
    },
  });

  const activate = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/status`, { status: "ACTIVE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User activated" });
    },
  });

  const resetPwd = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/reset-password`),
    onSuccess: () => toast({ title: "Password reset email sent" }),
  });

  const users = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or employee ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} users
          </span>
        )}
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Employee ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>MFA</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">
                      {user.staff
                        ? `${user.staff.firstName} ${user.staff.lastName}`
                        : "—"}
                    </div>
                    {user.staff && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {user.staff.employeeId}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {user.role.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[user.status] ?? "secondary"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.mfaEnabled ? (
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <ShieldOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => resetPwd.mutate(user.id)}
                          disabled={resetPwd.isPending}
                        >
                          {resetPwd.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <KeyRound className="mr-2 h-4 w-4" />
                          )}
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === "ACTIVE" ? (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => suspend.mutate(user.id)}
                            disabled={suspend.isPending}
                          >
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Suspend Account
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => activate.mutate(user.id)}
                            disabled={activate.isPending}
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Activate Account
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
