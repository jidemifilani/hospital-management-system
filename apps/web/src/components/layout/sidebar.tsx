"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  UserCog,
  FlaskConical,
  Pill,
  CreditCard,
  Settings,
  Building2,
  Stethoscope,
  Tags,
  CalendarRange,
  ShieldCheck,
  BedDouble,
  BarChart3,
  ClipboardList,
  CalendarOff,
  ScanLine,
  ArrowRightLeft,
  MonitorDot,
  UserCheck,
  AlertTriangle,
  Droplets,
  ShieldPlus,
  Bed,
  Syringe,
  ClipboardCheck,
  ShoppingCart,
  Boxes,
  Utensils,
  HeartPulse,
  Wallet,
  FileBadge,
  PersonStanding,
  Target,
  MessageSquare,
  Truck,
  NotepadText,
  LifeBuoy,
  GraduationCap,
  ShieldAlert,
  Repeat2,
  Dumbbell,
  ClipboardPlus,
  FilePenLine,
  DoorOpen,
  Globe,
  PackageSearch,
  FolderOpen,
  BookOpen,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",    icon: LayoutDashboard, label: "Dashboard",    group: "core" },
  { href: "/patients",     icon: Users,           label: "Patients",     group: "core" },
  { href: "/appointments", icon: CalendarDays,    label: "Appointments", group: "core" },
  { href: "/encounters",   icon: Stethoscope,     label: "Encounters",   group: "core" },
  { href: "/admissions",   icon: BedDouble,       label: "Admissions",   group: "core" },
  { href: "/beds",         icon: BedDouble,       label: "Beds",         group: "core" },
  { href: "/staff",        icon: UserCog,         label: "Staff",        group: "core" },
  { href: "/departments",  icon: Building2,       label: "Departments",  group: "core" },
  { href: "/lab",          icon: FlaskConical,    label: "Laboratory",   group: "clinical" },
  { href: "/radiology",    icon: ScanLine,        label: "Radiology",    group: "clinical" },
  { href: "/pharmacy",     icon: Pill,            label: "Pharmacy",     group: "clinical" },
  { href: "/billing",      icon: CreditCard,      label: "Billing",      group: "clinical" },
  { href: "/pos",          icon: ShoppingCart,    label: "Point of Sale", group: "clinical" },
  { href: "/roster",       icon: CalendarRange,   label: "Roster",       group: "clinical" },
  { href: "/leave",        icon: CalendarOff,     label: "Leave",        group: "clinical" },
  { href: "/referrals",    icon: ArrowRightLeft,  label: "Referrals",    group: "clinical" },
  { href: "/opd-queue",    icon: MonitorDot,      label: "OPD Queue",    group: "clinical" },
  { href: "/theatre",      icon: Syringe,         label: "Theatre",      group: "clinical" },
  { href: "/blood-bank",   icon: Droplets,        label: "Blood Bank",   group: "clinical" },
  { href: "/hmo",          icon: ShieldPlus,      label: "Insurance & HMO", group: "clinical" },
  { href: "/insurance",    icon: FileBadge,       label: "Ad-hoc Claims", group: "clinical" },
  { href: "/care-plans",   icon: ClipboardCheck,  label: "Care Plans",   group: "clinical" },
  { href: "/dietary",      icon: Utensils,        label: "Dietary",      group: "clinical" },
  { href: "/triage",       icon: HeartPulse,      label: "Triage",       group: "clinical" },
  { href: "/mortuary",     icon: Bed,             label: "Mortuary",     group: "admin" },
  { href: "/inventory",    icon: PackageSearch,   label: "Inventory",    group: "admin" },
  { href: "/documents",    icon: FolderOpen,      label: "Documents",    group: "admin" },
  { href: "/accounting",   icon: BookOpen,        label: "Accounting",   group: "admin" },
  { href: "/procurement",  icon: ShoppingCart,    label: "Procurement",  group: "admin" },
  { href: "/assets",       icon: Boxes,           label: "Assets",       group: "admin" },
  { href: "/payroll",      icon: Wallet,          label: "Payroll",      group: "admin" },
  { href: "/appraisals",   icon: Target,          label: "Appraisals",   group: "admin" },
  { href: "/certificates", icon: FileBadge,       label: "Certificates", group: "clinical" },
  { href: "/feedback",     icon: MessageSquare,   label: "Feedback",     group: "clinical" },
  { href: "/visitors",     icon: PersonStanding,  label: "Visitors",     group: "core" },
  { href: "/transport",    icon: Truck,           label: "Transport",    group: "core" },
  { href: "/mar",          icon: NotepadText,     label: "MAR",          group: "clinical" },
  { href: "/alerts",       icon: ShieldAlert,     label: "Alerts",       group: "clinical" },
  { href: "/handover",     icon: Repeat2,         label: "Handover",     group: "clinical" },
  { href: "/rehab",        icon: Dumbbell,        label: "Rehab",        group: "clinical" },
  { href: "/ward-rounds",  icon: ClipboardPlus,   label: "Ward Rounds",  group: "clinical" },
  { href: "/consent",      icon: FilePenLine,     label: "Consent",      group: "clinical" },
  { href: "/discharge",    icon: DoorOpen,        label: "Discharge",    group: "clinical" },
  { href: "/helpdesk",     icon: LifeBuoy,        label: "Helpdesk",     group: "admin" },
  { href: "/training",     icon: GraduationCap,   label: "Training",     group: "admin" },
  { href: "/attendance",   icon: UserCheck,       label: "Attendance",   group: "admin" },
  { href: "/incidents",    icon: AlertTriangle,   label: "Incidents",    group: "admin" },
  { href: "/reports",      icon: BarChart3,       label: "Reports",      group: "admin" },
  { href: "/admin/users",  icon: ShieldCheck,     label: "Users & Roles",group: "admin" },
  { href: "/admin/audit",         icon: ClipboardList, label: "Audit Trail",     group: "admin" },
  { href: "/admin/catalogue",     icon: Tags,          label: "Service Catalogue", group: "admin" },
  { href: "/admin/site-settings", icon: Globe,         label: "Website Settings", group: "admin" },
];

const NAV_GROUPS: { key: string; label: string }[] = [
  { key: "core",     label: "Main" },
  { key: "clinical", label: "Clinical" },
  { key: "admin",    label: "Administration" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Stethoscope className="h-4 w-4" />
        </div>
        <span className="font-semibold tracking-tight">CareSync HMS</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        {NAV_GROUPS.map(({ key, label }) => {
          const items = navItems.filter((n) => n.group === key);
          return (
            <div key={key} className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {label}
              </p>
              {items.map(({ href, icon: Icon, label: itemLabel }) => {
                const active =
                  href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {itemLabel}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
