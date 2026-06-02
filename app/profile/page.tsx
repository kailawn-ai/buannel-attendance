"use client";

import { Building2, Clock, LogOut, Phone, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { attendanceApi, LaravelApiError, type StaffDetail, type User } from "@/lib/api";
import type { CachedAuth } from "@/lib/auth-cache";
import { clearCachedAuth, getCachedAuth } from "@/lib/auth-cache";

function getUserName(user: Pick<User, "employee_id" | "first_name" | "last_name" | "name">) {
  return user.name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.employee_id;
}

function formatErrorMessage(caughtError: unknown) {
  return caughtError instanceof LaravelApiError
    ? caughtError.message
    : "Unable to load profile details. Please check the backend API.";
}

function formatStaffSalary(staffDetail?: StaffDetail | null) {
  if (!staffDetail || staffDetail.salary === null || staffDetail.salary === undefined) {
    return "Not provided";
  }

  try {
    return `${new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: staffDetail.salary_currency || "INR",
      maximumFractionDigits: 0,
    }).format(staffDetail.salary)}${staffDetail.salary_frequency ? ` / ${staffDetail.salary_frequency}` : ""}`;
  } catch {
    return `${staffDetail.salary_currency || "INR"} ${staffDetail.salary}${staffDetail.salary_frequency ? ` / ${staffDetail.salary_frequency}` : ""}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatCachedAt(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ProfilePage() {
  const router = useRouter();
  const [cachedAuth] = useState<CachedAuth | null>(() => getCachedAuth());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(cachedAuth));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cachedAuth) {
      return;
    }

    let isMounted = true;

    attendanceApi.users
      .show(cachedAuth.user.id)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setUser(response.data);
        setError(null);
      })
      .catch((caughtError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(formatErrorMessage(caughtError));
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cachedAuth]);

  function handleLogout() {
    clearCachedAuth();
    router.push("/login");
  }

  if (!cachedAuth) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <p className="text-sm font-semibold text-brand-sky">Profile</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">No Cached Profile</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Sign in to cache your admin profile for this browser session.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-blue"
          >
            Go to Login
          </Link>
        </section>
      </div>
    );
  }

  const profileUser = user ?? {
    ...cachedAuth.user,
    name: getUserName({
      ...cachedAuth.user,
      name: "",
    }),
    created_at: cachedAuth.cachedAt,
    updated_at: cachedAuth.cachedAt,
    device_id: null,
    profile_image: null,
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <UserCircle aria-hidden="true" className="size-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-sky">Profile</p>
              <h1 className="mt-1 text-3xl font-bold text-foreground">
                {getUserName(profileUser)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {cachedAuth.user.isAdmin ? "Admin" : "User"} - {profileUser.employee_id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Logout
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Phone aria-hidden="true" className="size-5 text-brand-sky" />
            <p className="text-sm font-bold text-foreground">Phone</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "Loading..." : profileUser.phone_no || "-"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Building2 aria-hidden="true" className="size-5 text-brand-sky" />
            <p className="text-sm font-bold text-foreground">Organization</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading
              ? "Loading..."
              : user?.organization?.name ?? `Organization #${profileUser.organization_id}`}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <UserCircle aria-hidden="true" className="size-5 text-brand-sky" />
            <p className="text-sm font-bold text-foreground">Position</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "Loading..." : user?.staffDetail?.position || "Not specified"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Building2 aria-hidden="true" className="size-5 text-brand-sky" />
            <p className="text-sm font-bold text-foreground">Department</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "Loading..." : user?.staffDetail?.department || "Not specified"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Clock aria-hidden="true" className="size-5 text-brand-sky" />
            <p className="text-sm font-bold text-foreground">Join Date</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "Loading..." : formatDate(user?.staffDetail?.join_date)}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Building2 aria-hidden="true" className="size-5 text-brand-sky" />
            <p className="text-sm font-bold text-foreground">Salary</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "Loading..." : formatStaffSalary(user?.staffDetail)}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <UserCircle aria-hidden="true" className="size-5 text-brand-sky" />
            <p className="text-sm font-bold text-foreground">Device</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "Loading..." : profileUser.device_id || "-"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Clock aria-hidden="true" className="size-5 text-brand-sky" />
            <p className="text-sm font-bold text-foreground">Cached Session</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Cached {formatCachedAt(cachedAuth.cachedAt)}
            {cachedAuth.remembered ? " with remember session enabled." : "."}
          </p>
        </div>
      </section>
    </div>
  );
}
