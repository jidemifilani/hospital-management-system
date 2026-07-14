"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Users, CalendarDays, CreditCard, LayoutDashboard,
  FlaskConical, Pill, Building2, UserCog, BarChart3,
  ClipboardList, BedDouble, Settings, Shield, ScanLine, CalendarOff, ArrowRightLeft,
  MonitorDot, UserCheck, AlertTriangle, Droplets, ShieldPlus, Bed, Syringe, ClipboardCheck, ShoppingCart,
  Boxes, Utensils, HeartPulse, Wallet, FileBadge, PersonStanding, Target, MessageSquare, Truck,
  NotepadText, Wrench, GraduationCap, ShieldAlert, Repeat2, Dumbbell,
  ClipboardPlus, FilePenLine, DoorOpen,
} from "lucide-react";
import { api } from "@/lib/api-client";

const STATIC_PAGES = [
  { href: "/dashboard",    label: "Dashboard",     icon: LayoutDashboard, group: "Pages" },
  { href: "/patients",     label: "Patients",      icon: Users,           group: "Pages" },
  { href: "/appointments", label: "Appointments",  icon: CalendarDays,    group: "Pages" },
  { href: "/beds",         label: "Beds",          icon: BedDouble,       group: "Pages" },
  { href: "/lab",          label: "Laboratory",    icon: FlaskConical,    group: "Pages" },
  { href: "/radiology",    label: "Radiology",     icon: ScanLine,        group: "Pages" },
  { href: "/pharmacy",     label: "Pharmacy",      icon: Pill,            group: "Pages" },
  { href: "/leave",        label: "Leave",         icon: CalendarOff,     group: "Pages" },
  { href: "/referrals",    label: "Referrals",     icon: ArrowRightLeft,  group: "Pages" },
  { href: "/opd-queue",    label: "OPD Queue",     icon: MonitorDot,      group: "Pages" },
  { href: "/attendance",   label: "Attendance",    icon: UserCheck,       group: "Pages" },
  { href: "/incidents",    label: "Incidents",     icon: AlertTriangle,   group: "Pages" },
  { href: "/theatre",      label: "Theatre",       icon: Syringe, group: "Pages" },
  { href: "/blood-bank",   label: "Blood Bank",    icon: Droplets,        group: "Pages" },
  { href: "/insurance",    label: "Insurance",     icon: ShieldPlus,      group: "Pages" },
  { href: "/care-plans",   label: "Care Plans",    icon: ClipboardCheck,  group: "Pages" },
  { href: "/mortuary",     label: "Mortuary",      icon: Bed,             group: "Pages" },
  { href: "/procurement",  label: "Procurement",   icon: ShoppingCart,    group: "Pages" },
  { href: "/assets",       label: "Assets",        icon: Boxes,           group: "Pages" },
  { href: "/dietary",      label: "Dietary",       icon: Utensils,        group: "Pages" },
  { href: "/triage",       label: "Triage",        icon: HeartPulse,      group: "Pages" },
  { href: "/payroll",      label: "Payroll",       icon: Wallet,          group: "Pages" },
  { href: "/appraisals",   label: "Appraisals",    icon: Target,          group: "Pages" },
  { href: "/certificates", label: "Certificates",  icon: FileBadge,       group: "Pages" },
  { href: "/feedback",     label: "Feedback",      icon: MessageSquare,   group: "Pages" },
  { href: "/visitors",     label: "Visitors",      icon: PersonStanding,  group: "Pages" },
  { href: "/transport",    label: "Transport",     icon: Truck,           group: "Pages" },
  { href: "/mar",          label: "MAR",           icon: NotepadText,     group: "Pages" },
  { href: "/alerts",       label: "Alerts",        icon: ShieldAlert,     group: "Pages" },
  { href: "/handover",     label: "Handover",      icon: Repeat2,         group: "Pages" },
  { href: "/rehab",        label: "Rehab",         icon: Dumbbell,        group: "Pages" },
  { href: "/ward-rounds",  label: "Ward Rounds",   icon: ClipboardPlus,   group: "Pages" },
  { href: "/consent",      label: "Consent",       icon: FilePenLine,     group: "Pages" },
  { href: "/discharge",    label: "Discharge",     icon: DoorOpen,        group: "Pages" },
  { href: "/maintenance",  label: "Maintenance",   icon: Wrench,          group: "Pages" },
  { href: "/training",     label: "Training",      icon: GraduationCap,   group: "Pages" },
  { href: "/billing",      label: "Billing",       icon: CreditCard,      group: "Pages" },
  { href: "/staff",        label: "Staff",         icon: UserCog,         group: "Pages" },
  { href: "/departments",  label: "Departments",   icon: Building2,       group: "Pages" },
  { href: "/reports",      label: "Reports",       icon: BarChart3,       group: "Pages" },
  { href: "/admin/audit",  label: "Audit Trail",   icon: ClipboardList,   group: "Pages" },
  { href: "/admin/users",  label: "Users & Roles", icon: Shield,          group: "Pages" },
  { href: "/settings",     label: "Settings",      icon: Settings,        group: "Pages" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const { data: patients } = useQuery({
    queryKey: ["cmd-patients", search],
    queryFn: () =>
      api.get(`/patients?search=${encodeURIComponent(search)}&limit=5`).then((r: any) => r.data.data ?? []),
    enabled: search.length >= 2,
    staleTime: 10_000,
  });

  const { data: appointments } = useQuery({
    queryKey: ["cmd-appointments", search],
    queryFn: () =>
      api.get(`/appointments?search=${encodeURIComponent(search)}&limit=5`).then((r: any) => r.data.data ?? []),
    enabled: search.length >= 2,
    staleTime: 10_000,
  });

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
      setSearch("");
    },
    [router],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search patients, appointments, pages…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {patients && patients.length > 0 && (
          <CommandGroup heading="Patients">
            {patients.map((p: any) => (
              <CommandItem
                key={p.id}
                value={`patient-${p.id}`}
                onSelect={() => navigate(`/patients/${p.id}`)}
              >
                <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>{p.firstName} {p.lastName}</span>
                <span className="ml-auto text-xs text-muted-foreground">{p.mrn}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {appointments && appointments.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Appointments">
              {appointments.map((a: any) => (
                <CommandItem
                  key={a.id}
                  value={`appt-${a.id}`}
                  onSelect={() => navigate(`/appointments/${a.id}`)}
                >
                  <CalendarDays className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {a.patient?.firstName} {a.patient?.lastName}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(a.scheduledAt).toLocaleDateString()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Pages">
          {STATIC_PAGES.filter(
            (p) => !search || p.label.toLowerCase().includes(search.toLowerCase()),
          ).map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} value={href} onSelect={() => navigate(href)}>
              <Icon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
