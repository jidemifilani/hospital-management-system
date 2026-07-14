"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, FlaskConical, Pill, CreditCard, Package } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";

interface Stats {
  pendingLabOrders: number;
  pendingPrescriptions: number;
  outstandingInvoices: number;
  lowStockDrugs: number;
}

const ITEMS = [
  { key: "pendingLabOrders",     icon: FlaskConical, label: "Pending lab orders",     href: "/lab",      color: "text-blue-600" },
  { key: "pendingPrescriptions", icon: Pill,         label: "Pending prescriptions",  href: "/pharmacy", color: "text-green-600" },
  { key: "outstandingInvoices",  icon: CreditCard,   label: "Outstanding invoices",   href: "/billing",  color: "text-amber-600" },
  { key: "lowStockDrugs",        icon: Package,      label: "Low-stock drugs",        href: "/pharmacy", color: "text-red-600" },
] as const;

export function NotificationBell() {
  const { data } = useQuery<Stats>({
    queryKey: ["dashboard-stats-bell"],
    queryFn: () => api.get("/dashboard/stats").then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const total = data
    ? (data.pendingLabOrders ?? 0) +
      (data.pendingPrescriptions ?? 0) +
      (data.outstandingInvoices ?? 0) +
      (data.lowStockDrugs ?? 0)
    : 0;

  const alerts = ITEMS.map((item) => ({
    ...item,
    count: data ? (data[item.key] ?? 0) : 0,
  })).filter((item) => item.count > 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <Badge
              className="absolute -right-1 -top-1 h-4 w-4 min-w-4 rounded-full p-0 text-[10px] flex items-center justify-center"
              variant="destructive"
            >
              {total > 99 ? "99+" : total}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Alerts</p>
          {total > 0 && (
            <Badge variant="destructive" className="text-xs">{total} pending</Badge>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">All clear — no pending alerts</p>
          </div>
        ) : (
          <div className="divide-y">
            {alerts.map(({ key, icon: Icon, label, href, color, count }) => (
              <Link
                key={key}
                href={href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-muted ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{count} {label}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
