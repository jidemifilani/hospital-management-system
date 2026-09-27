"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  READ: "bg-gray-100 text-gray-600",
  LOGIN: "bg-violet-100 text-violet-700",
  LOGOUT: "bg-gray-100 text-gray-500",
  EXPORT: "bg-amber-100 text-amber-700",
};

const RESOURCES = [
  "All", "patient", "appointment", "invoice", "payment", "lab_order",
  "prescription", "user", "staff", "department", "bed",
];

const ACTIONS = ["All", "CREATE", "UPDATE", "DELETE", "READ", "LOGIN", "LOGOUT", "EXPORT"];

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState("All");
  const [action, setAction] = useState("All");
  const [userId, setUserId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, resource, action, userId],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (resource !== "All") params.set("resource", resource);
      if (action !== "All") params.set("action", action);
      if (userId.trim()) params.set("userId", userId.trim());
      return api.get(`/audit?${params}`).then((r: any) => r.data);
    },
  });

  const items: any[] = data?.data ?? [];
  const totalPages: number = data?.pages ?? 1;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Audit Trail</h1>
          <p className="text-sm text-muted-foreground">All system activity across users and resources</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter by user ID..."
              className="pl-8 h-8 text-sm"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={resource} onValueChange={(v) => { setResource(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[150px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RESOURCES.map((r) => <SelectItem key={r} value={r}>{r === "All" ? "All Resources" : r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[140px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a === "All" ? "All Actions" : a}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Activity Log</span>
            {data && <span className="text-muted-foreground font-normal">{data.total?.toLocaleString()} entries</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Timestamp</th>
                    <th className="px-4 py-2 text-left font-medium">User</th>
                    <th className="px-4 py-2 text-left font-medium">Action</th>
                    <th className="px-4 py-2 text-left font-medium">Resource</th>
                    <th className="px-4 py-2 text-left font-medium">Resource ID</th>
                    <th className="px-4 py-2 text-left font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No audit entries found</td></tr>
                  ) : items.map((log: any) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-xs leading-tight">
                          {log.user?.staff
                            ? `${log.user.staff.firstName} ${log.user.staff.lastName}`
                            : log.user?.email ?? "System"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{log.user?.email}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono">{log.resource}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono truncate max-w-[160px]">
                        {log.resourceId ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{log.ipAddress ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
