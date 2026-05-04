"use client";

import { Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { AppSidebar } from "./app-sidebar";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      setIsSidebarExpanded(window.localStorage.getItem("nielit-sidebar-expanded") !== "false");
    });
  }, []);

  function toggleSidebar() {
    setIsSidebarExpanded((current) => {
      const next = !current;
      window.localStorage.setItem("nielit-sidebar-expanded", String(next));
      return next;
    });
  }

  function toggleTheme() {
    const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";

    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.classList.toggle("light", nextTheme === "light");
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem("nielit-theme", nextTheme);
  }

  const SidebarIcon = isSidebarExpanded ? PanelLeftClose : PanelLeftOpen;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="flex min-h-dvh">
        <AppSidebar isExpanded={isSidebarExpanded} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
                title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
                className="hidden size-10 place-items-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground md:grid"
              >
                <SidebarIcon aria-hidden="true" className="size-5" />
              </button>

              <div className="grid size-10 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground md:hidden">
                N
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">NIELIT Admin</p>
                <p className="text-xs text-muted-foreground">Attendance Console</p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title="Toggle theme"
              className="grid size-10 place-items-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              <Moon aria-hidden="true" className="theme-icon-moon size-5" />
              <Sun aria-hidden="true" className="theme-icon-sun size-5" />
            </button>
          </header>
          <AppSidebar isExpanded={isSidebarExpanded} variant="mobile" />
          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-6 lg:px-8">{children}</main>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        closeOnClick
        draggable
        newestOnTop
        pauseOnFocusLoss
        pauseOnHover
      />
    </div>
  );
}
