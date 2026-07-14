"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users, CalendarCheck, Bed, Activity,
  FlaskConical, Pill, CreditCard, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";

interface DashboardStat {
  totalPatients: number;
  appointmentsToday: number;
  availableBeds: number;
  activeEncounters: number;
  pendingLabOrders: number;
  pendingPrescriptions: number;
  outstandingInvoices: number;
  lowStockDrugs: number;
}

export function DashboardStats() {
  const { data, isError } = useQuery<DashboardStat>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/dashboard/stats").then((r) => r.data),
    refetchInterval: 30_000,
    retry: 2,
  });

  const stats = [
    {
      title: "Total Patients",
      value: data?.totalPatients ?? "—",
      icon: Users,
      description: "Registered patients",
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/patients",
    },
    {
      title: "Today's Appointments",
      value: data?.appointmentsToday ?? "—",
      icon: CalendarCheck,
      description: "Scheduled for today",
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/appointments",
    },
    {
      title: "Available Beds",
      value: data?.availableBeds ?? "—",
      icon: Bed,
      description: "Currently unoccupied",
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/beds",
    },
    {
      title: "Active Encounters",
      value: data?.activeEncounters ?? "—",
      icon: Activity,
      description: "Patients being seen now",
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/appointments",
    },
    {
      title: "Pending Lab Orders",
      value: data?.pendingLabOrders ?? "—",
      icon: FlaskConical,
      description: "Awaiting processing",
      color: "text-sky-600",
      bg: "bg-sky-50",
      href: "/lab",
    },
    {
      title: "Pending Prescriptions",
      value: data?.pendingPrescriptions ?? "—",
      icon: Pill,
      description: "Awaiting dispensing",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      href: "/pharmacy",
    },
    {
      title: "Outstanding Invoices",
      value: data?.outstandingInvoices ?? "—",
      icon: CreditCard,
      description: "Issued or partially paid",
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/billing",
    },
    {
      title: "Low Stock Drugs",
      value: data?.lowStockDrugs ?? "—",
      icon: AlertTriangle,
      description: "At or below reorder level",
      color: data?.lowStockDrugs ? "text-red-600" : "text-gray-400",
      bg: data?.lowStockDrugs ? "bg-red-50" : "bg-gray-50",
      href: "/pharmacy",
    },
  ];

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load dashboard statistics. Check your connection and try refreshing.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ title, value, icon: Icon, description, color, bg, href }) => (
        <Link key={title} href={href} className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <div className={`rounded-lg p-2 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
