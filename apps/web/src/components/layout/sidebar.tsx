"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { PERMISSIONS, hasPermission } from "@hms/config";
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
  Factory,
  PhoneCall,
  FolderOpen,
  BookOpen,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",    icon: LayoutDashboard, label: "Dashboard",    group: "core", permission: PERMISSIONS.DASHBOARD_VIEW },
  { href: "/patients",     icon: Users,           label: "Patients",     group: "core", permission: PERMISSIONS.PATIENTS_READ },
  { href: "/appointments", icon: CalendarDays,    label: "Appointments", group: "core", permission: PERMISSIONS.APPOINTMENTS_READ },
  { href: "/recalls",      icon: PhoneCall,       label: "Patient Recall", group: "core", permission: PERMISSIONS.APPOINTMENTS_READ },
  { href: "/encounters",   icon: Stethoscope,     label: "Encounters",   group: "core", permission: PERMISSIONS.ENCOUNTERS_READ },
  { href: "/admissions",   icon: BedDouble,       label: "Admissions",   group: "core", permission: PERMISSIONS.ADMISSIONS_READ },
  { href: "/beds",         icon: BedDouble,       label: "Beds",         group: "core", permission: PERMISSIONS.ADMISSIONS_READ },
  { href: "/staff",        icon: UserCog,         label: "Staff",        group: "core", permission: PERMISSIONS.STAFF_READ },
  { href: "/departments",  icon: Building2,       label: "Departments",  group: "core", permission: PERMISSIONS.ADMIN_CONFIG },
  { href: "/lab",          icon: FlaskConical,    label: "Laboratory",   group: "clinical", permission: PERMISSIONS.LAB_READ },
  { href: "/radiology",    icon: ScanLine,        label: "Radiology",    group: "clinical", permission: PERMISSIONS.RADIOLOGY_READ },
  { href: "/pharmacy",     icon: Pill,            label: "Pharmacy",     group: "clinical", permission: PERMISSIONS.PHARMACY_READ },
  { href: "/billing",      icon: CreditCard,      label: "Billing",      group: "clinical", permission: PERMISSIONS.BILLING_READ },
  { href: "/pos",          icon: ShoppingCart,    label: "Point of Sale", group: "clinical", permission: PERMISSIONS.POS_READ },
  { href: "/roster",       icon: CalendarRange,   label: "Roster",       group: "clinical", permission: PERMISSIONS.ROSTER_READ },
  { href: "/leave",        icon: CalendarOff,     label: "Leave",        group: "clinical", permission: PERMISSIONS.LEAVE_READ },
  { href: "/referrals",    icon: ArrowRightLeft,  label: "Referrals",    group: "clinical", permission: PERMISSIONS.REFERRALS_READ },
  { href: "/opd-queue",    icon: MonitorDot,      label: "OPD Queue",    group: "clinical", permission: PERMISSIONS.OPD_READ },
  { href: "/theatre",      icon: Syringe,         label: "Theatre",      group: "clinical", permission: PERMISSIONS.THEATRE_READ },
  { href: "/blood-bank",   icon: Droplets,        label: "Blood Bank",   group: "clinical", permission: PERMISSIONS.BLOOD_BANK_READ },
  { href: "/hmo",          icon: ShieldPlus,      label: "Insurance & HMO", group: "clinical", permission: PERMISSIONS.INSURANCE_READ },
  { href: "/insurance",    icon: FileBadge,       label: "Ad-hoc Claims", group: "clinical", permission: PERMISSIONS.INSURANCE_READ },
  { href: "/care-plans",   icon: ClipboardCheck,  label: "Care Plans",   group: "clinical", permission: PERMISSIONS.CARE_PLAN_READ },
  { href: "/dietary",      icon: Utensils,        label: "Dietary",      group: "clinical", permission: PERMISSIONS.DIETARY_READ },
  { href: "/triage",       icon: HeartPulse,      label: "Triage",       group: "clinical", permission: PERMISSIONS.TRIAGE_READ },
  { href: "/mortuary",     icon: Bed,             label: "Mortuary",     group: "admin", permission: PERMISSIONS.MORTUARY_READ },
  { href: "/inventory",    icon: PackageSearch,   label: "Inventory",    group: "admin", permission: PERMISSIONS.INVENTORY_READ },
  { href: "/production",   icon: Factory,         label: "Production",   group: "admin", permission: PERMISSIONS.INVENTORY_READ },
  { href: "/documents",    icon: FolderOpen,      label: "Documents",    group: "admin", permission: PERMISSIONS.DOCUMENTS_READ },
  { href: "/accounting",   icon: BookOpen,        label: "Accounting",   group: "admin", permission: PERMISSIONS.ACCOUNTING_READ },
  { href: "/procurement",  icon: ShoppingCart,    label: "Procurement",  group: "admin", permission: PERMISSIONS.PROCUREMENT_READ },
  { href: "/assets",       icon: Boxes,           label: "Assets",       group: "admin", permission: PERMISSIONS.ASSETS_READ },
  { href: "/payroll",      icon: Wallet,          label: "Payroll",      group: "admin", permission: PERMISSIONS.PAYROLL_READ },
  { href: "/appraisals",   icon: Target,          label: "Appraisals",   group: "admin", permission: PERMISSIONS.APPRAISALS_READ },
  { href: "/certificates", icon: FileBadge,       label: "Certificates", group: "clinical", permission: PERMISSIONS.CERTIFICATES_READ },
  { href: "/feedback",     icon: MessageSquare,   label: "Feedback",     group: "clinical", permission: PERMISSIONS.FEEDBACK_READ },
  { href: "/visitors",     icon: PersonStanding,  label: "Visitors",     group: "core", permission: PERMISSIONS.VISITORS_READ },
  { href: "/transport",    icon: Truck,           label: "Transport",    group: "core", permission: PERMISSIONS.TRANSPORT_READ },
  { href: "/mar",          icon: NotepadText,     label: "MAR",          group: "clinical", permission: PERMISSIONS.MAR_READ },
  { href: "/alerts",       icon: ShieldAlert,     label: "Alerts",       group: "clinical", permission: PERMISSIONS.ALERTS_READ },
  { href: "/handover",     icon: Repeat2,         label: "Handover",     group: "clinical", permission: PERMISSIONS.HANDOVER_READ },
  { href: "/rehab",        icon: Dumbbell,        label: "Rehab",        group: "clinical", permission: PERMISSIONS.REHAB_READ },
  { href: "/ward-rounds",  icon: ClipboardPlus,   label: "Ward Rounds",  group: "clinical", permission: PERMISSIONS.WARD_ROUND_READ },
  { href: "/consent",      icon: FilePenLine,     label: "Consent",      group: "clinical", permission: PERMISSIONS.CONSENT_READ },
  { href: "/discharge",    icon: DoorOpen,        label: "Discharge",    group: "clinical", permission: PERMISSIONS.DISCHARGE_READ },
  { href: "/helpdesk",     icon: LifeBuoy,        label: "Helpdesk",     group: "admin", permission: PERMISSIONS.MAINTENANCE_READ },
  { href: "/training",     icon: GraduationCap,   label: "Training",     group: "admin", permission: PERMISSIONS.TRAINING_READ },
  { href: "/attendance",   icon: UserCheck,       label: "Attendance",   group: "admin", permission: PERMISSIONS.ATTENDANCE_READ },
  { href: "/incidents",    icon: AlertTriangle,   label: "Incidents",    group: "admin", permission: PERMISSIONS.INCIDENTS_READ },
  { href: "/reports",      icon: BarChart3,       label: "Reports",      group: "admin", permission: PERMISSIONS.DASHBOARD_VIEW },
  { href: "/admin/users",  icon: ShieldCheck,     label: "Users & Roles",group: "admin", permission: PERMISSIONS.STAFF_READ },
  { href: "/admin/audit",         icon: ClipboardList, label: "Audit Trail",     group: "admin", permission: PERMISSIONS.ADMIN_AUDIT },
  { href: "/admin/catalogue",     icon: Tags,          label: "Service Catalogue", group: "admin", permission: PERMISSIONS.CATALOGUE_READ },
  { href: "/admin/site-settings", icon: Globe,         label: "Website Settings", group: "admin", permission: PERMISSIONS.ADMIN_CONFIG },
];

const NAV_GROUPS: { key: string; label: string }[] = [
  { key: "core",     label: "Main" },
  { key: "clinical", label: "Clinical" },
  { key: "admin",    label: "Administration" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  // Nothing is offered until the role is known. Rendering the full menu first
  // and then taking items away shows people links they cannot use and makes
  // the sidebar jump as it settles; an empty frame for a moment is honest.
  const visible =
    status === "authenticated"
      ? navItems.filter((item) => hasPermission(role, item.permission))
      : [];

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
          const items = visible.filter((n) => n.group === key);
          // A heading with nothing under it reads as a section that failed to
          // load rather than one this role has no part in.
          if (items.length === 0) return null;
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
      {/* Outside the groups above, so it needs its own check — it is the one
          link that would otherwise stay visible to a role without it. */}
      {hasPermission(role, PERMISSIONS.SETTINGS_READ) && (
        <div className="border-t p-4">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      )}
    </aside>
  );
}
