"use client";

import {
  CalendarCheck,
  LayoutDashboard,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { CachedAuth } from "@/lib/auth-cache";
import Image from "next/image";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Users", href: "/users", icon: Users },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck },
];

const profileNavItem: NavItem = {
  label: "Profile",
  href: "/profile",
  icon: UserCircle,
};

type AppSidebarProps = {
  isExpanded: boolean;
  cachedAuth: CachedAuth | null;
  variant?: "desktop" | "mobile";
};

function isNavItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function AppSidebar({
  isExpanded,
  cachedAuth,
  variant = "desktop",
}: AppSidebarProps) {
  const pathname = usePathname();

  const mobileNavItems = [...navItems, profileNavItem];

  if (variant === "mobile") {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 gap-1 border-t border-border bg-card p-1 shadow-soft md:hidden">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-sm px-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              }`}
            >
              <span
                className={`grid size-5 place-items-center ${
                  isActive ? "text-primary-foreground" : "text-brand-sky"
                }`}
              >
                <Icon className="size-5" />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <aside
      className={`sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-card/95 shadow-soft backdrop-blur transition-[width] duration-300 ease-out md:flex md:flex-col ${
        isExpanded ? "w-60" : "w-16"
      }`}
    >
      <div
        className={`flex h-16 items-center border-b border-border ${
          isExpanded ? "gap-3 px-4" : "justify-center px-0"
        }`}
      >
        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg shadow-sm">
          <Image
            src="/logo.jpg"
            alt="Logo"
            fill
            className="object-cover"
            priority
          />
        </div>

        <div
          className={`min-w-0 transition-opacity duration-200 ${
            isExpanded ? "opacity-100" : "pointer-events-none w-0 opacity-0"
          }`}
        >
          <p className="truncate text-sm font-bold text-foreground">
            {cachedAuth?.user?.organization?.name || "NIELIT Admin"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Attendance Console
          </p>
        </div>
      </div>

      <nav
        className={`flex flex-1 flex-col gap-2 py-5 ${
          isExpanded ? "px-3" : "px-2"
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isExpanded ? undefined : item.label}
              className={`group flex h-12 items-center rounded-md text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              } ${
                isExpanded ? "justify-start gap-3 px-3" : "justify-center px-0"
              }`}
            >
              <span
                className={`grid size-6 place-items-center ${
                  isActive
                    ? "text-primary-foreground"
                    : "text-brand-sky group-hover:text-primary"
                }`}
              >
                <Icon className="size-5" />
              </span>

              <span
                className={`truncate transition-opacity duration-200 ${
                  isExpanded
                    ? "opacity-100"
                    : "pointer-events-none w-0 opacity-0"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        <div className="mt-auto border-t border-border pt-3">
          <Link
            href={profileNavItem.href}
            title={isExpanded ? undefined : profileNavItem.label}
            className={`group flex h-12 items-center rounded-md text-sm font-semibold transition-colors ${
              isNavItemActive(pathname, profileNavItem.href)
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
            } ${
              isExpanded ? "justify-start gap-3 px-3" : "justify-center px-0"
            }`}
          >
            <span className="grid size-6 place-items-center">
              <UserCircle className="size-5" />
            </span>

            <span
              className={`truncate transition-opacity duration-200 ${
                isExpanded ? "opacity-100" : "pointer-events-none w-0 opacity-0"
              }`}
            >
              Profile
            </span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
