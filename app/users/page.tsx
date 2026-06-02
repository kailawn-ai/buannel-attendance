"use client";

import {
  AlertCircle,
  CalendarCheck,
  Eye,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { attendanceApi, LaravelApiError, type User } from "@/lib/api";

function getUserName(user: User) {
  return (
    user.name || [user.first_name, user.last_name].filter(Boolean).join(" ")
  );
}

function getOrganizationName(user: User) {
  return user.organization?.name ?? `Organization #${user.organization_id}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getErrorMessage(caughtError: unknown) {
  return caughtError instanceof LaravelApiError
    ? caughtError.message
    : "Unable to load users. Please check the backend API.";
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsLoadingUserId, setDetailsLoadingUserId] = useState<number | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await attendanceApi.users.list();
      setUsers(response.data);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  async function deleteUser(user: User) {
    const shouldDelete = window.confirm(`Delete ${getUserName(user)}?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingUserId(user.id);
    setError(null);

    try {
      await attendanceApi.users.delete(user.id);
      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id),
      );
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setDeletingUserId(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    attendanceApi.users
      .list()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setUsers(response.data);
        setError(null);
      })
      .catch((caughtError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(getErrorMessage(caughtError));
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
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const values = [
        user.employee_id,
        getUserName(user),
        user.phone_no,
        user.device_id,
        getOrganizationName(user),
      ].filter((value): value is string => Boolean(value));

      return values.some((value) => value.toLowerCase().includes(query));
    });
  }, [searchTerm, users]);

  async function handleViewDetails(user: User) {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
      setDetailsError(null);
      return;
    }

    setDetailsLoadingUserId(user.id);
    setDetailsError(null);

    try {
      const response = await attendanceApi.users.show(user.id);
      setSelectedUser(response.data);
    } catch (caughtError) {
      setDetailsError(
        caughtError instanceof LaravelApiError
          ? caughtError.message
          : "Unable to load staff details. Please try again.",
      );
      setSelectedUser(null);
    } finally {
      setDetailsLoadingUserId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-sky">Users</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              Employee Directory
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Search and review registered employees, organizations, devices,
              contact details, and profile images.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-secondary-foreground">
            <Users aria-hidden="true" className="size-5 text-brand-sky" />
            <span className="text-sm font-semibold">{users.length} users</span>
          </div>
        </div>
      </section>

      {selectedUser ? (
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-sky">Staff Details</p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">
                {getUserName(selectedUser)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedUser.staffDetail ? "Loaded from backend." : "No staff details available."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleViewDetails(selectedUser)}
              className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              {detailsLoadingUserId === selectedUser.id ? "Refreshing" : "Hide details"}
            </button>
          </div>

          {detailsError ? (
            <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {detailsError}
            </div>
          ) : null}

          {selectedUser.staffDetail ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-border bg-secondary p-4">
                <p className="text-sm font-semibold text-foreground">Position</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedUser.staffDetail.position || "Not specified"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <p className="text-sm font-semibold text-foreground">Department</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedUser.staffDetail.department || "Not specified"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <p className="text-sm font-semibold text-foreground">Join Date</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatDate(selectedUser.staffDetail.join_date)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <p className="text-sm font-semibold text-foreground">Salary</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedUser.staffDetail.salary !== null
                    ? `${selectedUser.staffDetail.salary_currency || "INR"} ${selectedUser.staffDetail.salary}${selectedUser.staffDetail.salary_frequency ? ` / ${selectedUser.staffDetail.salary_frequency}` : ""}`
                    : "Not provided"}
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <label className="relative block w-full md:max-w-md">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, employee ID, organization, phone, device"
              className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </label>

          <button
            type="button"
            onClick={() => void loadUsers({ silent: true })}
            disabled={isRefreshing || isLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="flex items-start gap-3 p-6 text-destructive">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0"
            />
            <div>
              <p className="text-sm font-semibold">Could not load users</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : (
          <div className="themed-scrollbar overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Employee ID</th>
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Device</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4">
                        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="ml-auto h-9 w-20 animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-secondary/60"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {getUserName(user)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.profile_image
                                ? "Profile image linked"
                                : "No profile image"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-foreground">
                        {user.employee_id}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-foreground">
                          {getOrganizationName(user)}
                        </p>
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
                          {user.organization?.type ?? "organization"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {user.phone_no || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {user.device_id || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <div className="group relative">
                            <Link
                              href={`/attendance?mode=user&employee_id=${encodeURIComponent(user.employee_id)}`}
                              aria-label={`View attendance for ${getUserName(user)}`}
                              className="grid size-9 place-items-center rounded-md border border-border bg-background text-brand-sky transition-colors hover:bg-brand-sky hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            >
                              <CalendarCheck
                                aria-hidden="true"
                                className="size-4"
                              />
                            </Link>
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-semibold text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                              Attendance
                            </span>
                          </div>
                          <div className="group relative">
                            <button
                              type="button"
                              onClick={() => void handleViewDetails(user)}
                              aria-label={`View staff details for ${getUserName(user)}`}
                              className="grid size-9 place-items-center rounded-md border border-border bg-background text-brand-sky transition-colors hover:bg-brand-sky hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                              disabled={detailsLoadingUserId === user.id}
                            >
                              <Eye aria-hidden="true" className="size-4" />
                            </button>
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-semibold text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                              Details
                            </span>
                          </div>
                          <div className="group relative">
                            <Link
                              href={`/users/${user.id}`}
                              aria-label={`Edit ${getUserName(user)}`}
                              className="grid size-9 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            >
                              <Pencil aria-hidden="true" className="size-4" />
                            </Link>
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-semibold text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                              Edit
                            </span>
                          </div>
                          <div className="group relative">
                            <button
                              type="button"
                              onClick={() => void deleteUser(user)}
                              disabled={deletingUserId === user.id}
                              aria-label={`Delete ${getUserName(user)}`}
                              className="grid size-9 place-items-center rounded-md border border-border bg-background text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 aria-hidden="true" className="size-4" />
                            </button>
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-semibold text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                              Delete
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <p className="text-sm font-semibold text-foreground">
                        No users found
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try a different search term or refresh the list.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
