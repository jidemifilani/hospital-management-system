"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import {
  LogOut, User, ChevronDown, Menu, Stethoscope,
  LayoutDashboard, Users, CalendarDays, UserCog, FlaskConical,
  Pill, CreditCard, Building2, CalendarRange, ShieldCheck, Settings,
  BedDouble, BarChart3, Search, ClipboardList, CalendarOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette } from "./command-palette";
import { getInitials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mobileNavItems = [
  { href: "/dashboard",    icon: LayoutDashboard, label: "Dashboard" },
  { href: "/patients",     icon: Users,           label: "Patients" },
  { href: "/appointments", icon: CalendarDays,    label: "Appointments" },
  { href: "/beds",         icon: BedDouble,       label: "Beds" },
  { href: "/staff",        icon: UserCog,         label: "Staff" },
  { href: "/departments",  icon: Building2,       label: "Departments" },
  { href: "/lab",          icon: FlaskConical,    label: "Laboratory" },
  { href: "/pharmacy",     icon: Pill,            label: "Pharmacy" },
  { href: "/billing",      icon: CreditCard,      label: "Billing" },
  { href: "/roster",       icon: CalendarRange,   label: "Roster" },
  { href: "/leave",        icon: CalendarOff,     label: "Leave" },
  { href: "/reports",      icon: BarChart3,       label: "Reports" },
  { href: "/admin/users",  icon: ShieldCheck,     label: "Users & Roles" },
  { href: "/admin/audit",  icon: ClipboardList,   label: "Audit Trail" },
  { href: "/settings",     icon: Settings,        label: "Settings" },
];

interface TopBarProps {
  session: Session;
}

export function TopBar({ session }: TopBarProps) {
  const initials = getInitials(session.user.name ?? session.user.email ?? "?");
  const pathname = usePathname();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-16 items-center gap-2 border-b px-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Stethoscope className="h-4 w-4" />
              </div>
              <span className="font-semibold tracking-tight">CareSync HMS</span>
            </div>
            <nav className="p-4 space-y-1">
              {mobileNavItems.map(({ href, icon: Icon, label }) => {
                const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <span className="hidden text-sm text-muted-foreground sm:block">
          {new Date().toLocaleDateString("en-NG", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Cmd+K trigger */}
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex items-center gap-2 text-muted-foreground text-xs h-8 px-3"
          onClick={() => {
            const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true });
            document.dispatchEvent(event);
          }}
        >
          <Search className="h-3.5 w-3.5" />
          Search…
          <kbd className="ml-2 rounded border bg-muted px-1 text-[10px]">⌘K</kbd>
        </Button>
        <ThemeToggle />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{session.user.role?.toLowerCase().replace("_", " ")}</p>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
