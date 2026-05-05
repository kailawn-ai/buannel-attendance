"use client";

import { LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { AppSidebar } from "./app-sidebar";
import type { CachedAuth } from "@/lib/auth-cache";
import { clearCachedAuth, getCachedAuth } from "@/lib/auth-cache";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();

  const [cachedAuth, setCachedAuth] = useState<CachedAuth | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  useEffect(() => {
    setIsCheckingAuth(true);

    const data = getCachedAuth();

    setCachedAuth(data);

    if (pathname === "/login") {
      if (data) {
        router.replace("/");
        return;
      }

      setIsCheckingAuth(false);
      return;
    }

    if (!data) {
      clearCachedAuth();
      router.replace("/login");
      return;
    }

    setIsCheckingAuth(false);
  }, [pathname, router]);

  useEffect(() => {
    queueMicrotask(() => {
      setIsSidebarExpanded(
        window.localStorage.getItem("nielit-sidebar-expanded") !== "false",
      );
    });
  }, []);

  function toggleSidebar() {
    setIsSidebarExpanded((current) => {
      const next = !current;
      window.localStorage.setItem("nielit-sidebar-expanded", String(next));
      return next;
    });
  }

  function handleLogout() {
    clearCachedAuth();
    setCachedAuth(null);
    router.replace("/login");
  }

  function toggleTheme() {
    const nextTheme = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";

    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.classList.toggle("light", nextTheme === "light");
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem("nielit-theme", nextTheme);
  }

  const SidebarIcon = isSidebarExpanded ? PanelLeftClose : PanelLeftOpen;

  if (isCheckingAuth) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  if (pathname === "/login") {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        {children}
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

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="flex min-h-dvh">
        <AppSidebar isExpanded={isSidebarExpanded} cachedAuth={cachedAuth} />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* HEADER */}
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/90 px-1 backdrop-blur">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={
                  isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"
                }
                title={
                  isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"
                }
                className="hidden size-10 place-items-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground md:grid"
              >
                <SidebarIcon aria-hidden="true" className="size-5" />
              </button>

              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {cachedAuth?.user?.organization?.name || "NIELIT Admin"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Attendance Console
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Logout"
                title="Logout"
                className="grid size-10 place-items-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
              >
                <LogOut aria-hidden="true" className="size-5" />
              </button>
            </div>
          </header>

          <AppSidebar
            isExpanded={isSidebarExpanded}
            cachedAuth={cachedAuth}
            variant="mobile"
          />

          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-6 lg:px-8">
            {children}
          </main>
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
