"use client";

import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getCachedAuth } from "@/lib/auth-cache";
import {
  attendanceApi,
  LaravelApiError,
  type Attendance,
  type AttendanceStatus,
  type Organization,
  type User,
} from "@/lib/api";

type DashboardData = {
  users: User[];
  organizations: Organization[];
  todayRecords: Attendance[];
  monthRecords: Attendance[];
};

const emptyDashboardData: DashboardData = {
  users: [],
  organizations: [],
  todayRecords: [],
  monthRecords: [],
};

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function getErrorMessage(caughtError: unknown) {
  return caughtError instanceof LaravelApiError
    ? caughtError.message
    : "Unable to load dashboard data. Please check the backend API.";
}

function getUserName(user?: User | null) {
  if (!user) {
    return "Unknown User";
  }

  return user.name || [user.first_name, user.last_name].filter(Boolean).join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function formatCurrency(value: number, records: Attendance[]) {
  const currency =
    records.find((record) => record.user?.staffDetail?.salary_currency)?.user?.staffDetail
      ?.salary_currency || "INR";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

function statusClassName(status: AttendanceStatus) {
  switch (status) {
    case "present":
      return "bg-success/20 text-success";
    case "late":
      return "bg-brand-pink/15 text-brand-pink";
    case "half_day":
      return "bg-accent/15 text-accent";
    case "leave":
      return "bg-brand-sky/15 text-brand-sky";
    case "absent":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusLabel(status: AttendanceStatus) {
  return status.replace("_", " ");
}

function uniqueAttendanceUsers(records: Attendance[]) {
  return new Set(records.map((record) => record.user_id)).size;
}

function countByStatus(records: Attendance[], status: AttendanceStatus) {
  return records.filter((record) => record.status === status).length;
}

function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function getRecentWeekdays(month: string) {
  const today = new Date();
  const [year, monthNumber] = month.split("-").map(Number);
  const cursor =
    today.getFullYear() === year && today.getMonth() + 1 === monthNumber
      ? new Date(today)
      : new Date(year, monthNumber, 0);

  const days: string[] = [];

  while (days.length < 7 && cursor.getMonth() + 1 === monthNumber) {
    const day = cursor.getDay();

    if (day !== 0 && day !== 6) {
      days.unshift(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
          cursor.getDate(),
        ).padStart(2, "0")}`,
      );
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return days;
}

function getSalaryCutTotal(records: Attendance[]) {
  return records.reduce((total, record) => total + (record.salary_cut ?? 0), 0);
}

function filterRecordsByOrganization(records: Attendance[], organizationId: number | null) {
  if (!organizationId) {
    return records;
  }

  return records.filter((record) => record.user?.organization_id === organizationId);
}

export default function DashboardPage() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [dashboardData, setDashboardData] = useState<DashboardData>(emptyDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const [usersResponse, organizationsResponse, todayResponse, monthResponse] =
          await Promise.all([
            attendanceApi.users.list(),
            attendanceApi.organizations.list(),
            attendanceApi.attendance.today(),
            attendanceApi.attendance.admin({ month }),
          ]);
        const organizationId = getCachedAuth()?.user.organization_id ?? null;

        setDashboardData({
          users: organizationId
            ? usersResponse.data.filter((user) => user.organization_id === organizationId)
            : usersResponse.data,
          organizations: organizationId
            ? organizationsResponse.data.filter((organization) => organization.id === organizationId)
            : organizationsResponse.data,
          todayRecords: filterRecordsByOrganization(todayResponse.data, organizationId),
          monthRecords: filterRecordsByOrganization(monthResponse.data, organizationId),
        });
      } catch (caughtError) {
        const message = getErrorMessage(caughtError);
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [month],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const todaySummary = useMemo(() => {
    const totalUsers = dashboardData.users.length;
    const recordedUsers = uniqueAttendanceUsers(dashboardData.todayRecords);
    const present = countByStatus(dashboardData.todayRecords, "present");
    const late = countByStatus(dashboardData.todayRecords, "late");
    const leave = countByStatus(dashboardData.todayRecords, "leave");
    const halfDay = countByStatus(dashboardData.todayRecords, "half_day");
    const absentRecords = countByStatus(dashboardData.todayRecords, "absent");
    const missingUsers = Math.max(0, totalUsers - recordedUsers);
    const absent = absentRecords + missingUsers;

    return {
      totalUsers,
      recordedUsers,
      present,
      late,
      leave,
      halfDay,
      absent,
      attendanceRate: percent(present + late + halfDay, totalUsers),
      missingUsers,
    };
  }, [dashboardData.todayRecords, dashboardData.users.length]);

  const monthSummary = useMemo(() => {
    const records = dashboardData.monthRecords;
    const present = countByStatus(records, "present");
    const late = countByStatus(records, "late");
    const absent = countByStatus(records, "absent");
    const leave = countByStatus(records, "leave");
    const halfDay = countByStatus(records, "half_day");
    const salaryCut = getSalaryCutTotal(records);

    return {
      total: records.length,
      present,
      late,
      absent,
      leave,
      halfDay,
      exceptions: late + absent + leave + halfDay,
      salaryCut,
    };
  }, [dashboardData.monthRecords]);

  const weeklyActivity = useMemo(() => {
    const recentWeekdays = getRecentWeekdays(month);

    return recentWeekdays.map((date) => {
      const dayRecords = dashboardData.monthRecords.filter(
        (record) => record.attendance_date === date,
      );

      return {
        date,
        present: countByStatus(dayRecords, "present") + countByStatus(dayRecords, "late"),
        leave: countByStatus(dayRecords, "leave"),
        absent: countByStatus(dayRecords, "absent"),
        total: dayRecords.length,
      };
    });
  }, [dashboardData.monthRecords, month]);

  const topOrganizations = useMemo(() => {
    return [...dashboardData.organizations]
      .sort((first, second) => (second.users_count ?? 0) - (first.users_count ?? 0))
      .slice(0, 5);
  }, [dashboardData.organizations]);

  const todayRecords = useMemo(() => {
    return [...dashboardData.todayRecords]
      .sort((first, second) => String(first.check_in ?? "").localeCompare(String(second.check_in ?? "")))
      .slice(0, 8);
  }, [dashboardData.todayRecords]);

  const exceptionRecords = useMemo(() => {
    return dashboardData.monthRecords
      .filter((record) => record.status !== "present")
      .sort((first, second) => second.attendance_date.localeCompare(first.attendance_date))
      .slice(0, 8);
  }, [dashboardData.monthRecords]);

  const statusMix = [
    { label: "Present", value: monthSummary.present, tone: "bg-success", text: "text-success" },
    { label: "Late", value: monthSummary.late, tone: "bg-brand-pink", text: "text-brand-pink" },
    { label: "Leave", value: monthSummary.leave, tone: "bg-brand-sky", text: "text-brand-sky" },
    { label: "Half Day", value: monthSummary.halfDay, tone: "bg-accent", text: "text-accent" },
    { label: "Absent", value: monthSummary.absent, tone: "bg-destructive", text: "text-destructive" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-sky">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">Attendance Overview</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Live attendance, workforce coverage, leave usage, and monthly exceptions for the
              admin workspace.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
            <button
              type="button"
              onClick={() => void loadDashboard({ silent: true })}
              disabled={isLoading || isRefreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                aria-hidden="true"
                className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-destructive">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Could not load dashboard</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Total Users"
          value={todaySummary.totalUsers}
          detail={`${dashboardData.organizations.length} organizations`}
          tone="text-brand-blue"
          isLoading={isLoading}
        />
        <MetricCard
          icon={UserCheck}
          label="Present Today"
          value={todaySummary.present + todaySummary.late + todaySummary.halfDay}
          detail={`${todaySummary.attendanceRate}% attendance rate`}
          tone="text-success"
          isLoading={isLoading}
        />
        <MetricCard
          icon={ShieldAlert}
          label="No Record / Absent"
          value={todaySummary.absent}
          detail={`${todaySummary.missingUsers} without record today`}
          tone="text-destructive"
          isLoading={isLoading}
        />
        <MetricCard
          icon={Wallet}
          label="Monthly Salary Cut"
          value={formatCurrency(monthSummary.salaryCut, dashboardData.monthRecords)}
          detail={formatMonth(month)}
          tone="text-brand-pink"
          isLoading={isLoading}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Monthly Attendance Mix</h2>
              <p className="mt-1 text-sm text-muted-foreground">{formatMonth(month)}</p>
            </div>
            <Link
              href={`/attendance?mode=month&month=${month}`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              Open Records
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="flex flex-col gap-3">
              {statusMix.map((item) => {
                const width = percent(item.value, Math.max(1, monthSummary.total));

                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className={`font-bold ${item.text}`}>{item.value}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-sm bg-muted">
                      <div className={`h-full rounded-sm ${item.tone}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 rounded-md border border-border bg-secondary p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Monthly Records</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{monthSummary.total}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Exceptions</p>
                <p className="mt-1 text-2xl font-bold text-brand-pink">
                  {monthSummary.exceptions}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Today</h2>
              <p className="mt-1 text-sm text-muted-foreground">{formatDate(getTodayDateString())}</p>
            </div>
            <CalendarDays aria-hidden="true" className="size-5 text-brand-sky" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat label="Recorded" value={todaySummary.recordedUsers} />
            <MiniStat label="Late" value={todaySummary.late} tone="text-brand-pink" />
            <MiniStat label="Leave" value={todaySummary.leave} tone="text-brand-sky" />
            <MiniStat label="Half Day" value={todaySummary.halfDay} tone="text-accent" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Recent Weekdays</h2>
              <p className="mt-1 text-sm text-muted-foreground">Recorded attendance by day</p>
            </div>
            <TrendingUp aria-hidden="true" className="size-5 text-success" />
          </div>

          <div className="mt-6 flex h-64 items-end gap-3">
            {weeklyActivity.map((day) => {
              const totalUsers = Math.max(1, todaySummary.totalUsers);
              const presentHeight = Math.max(4, percent(day.present, totalUsers));
              const leaveHeight = Math.max(day.leave > 0 ? 4 : 0, percent(day.leave, totalUsers));
              const absentHeight = Math.max(day.absent > 0 ? 4 : 0, percent(day.absent, totalUsers));

              return (
                <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-48 w-full max-w-12 items-end justify-center rounded-sm bg-muted p-1">
                    <div className="flex h-full w-full items-end gap-0.5">
                      <div
                        className="w-full rounded-sm bg-success"
                        style={{ height: `${presentHeight}%` }}
                        title={`${day.present} present or late`}
                      />
                      <div
                        className="w-full rounded-sm bg-brand-sky"
                        style={{ height: `${leaveHeight}%` }}
                        title={`${day.leave} leave`}
                      />
                      <div
                        className="w-full rounded-sm bg-destructive"
                        style={{ height: `${absentHeight}%` }}
                        title={`${day.absent} absent`}
                      />
                    </div>
                  </div>
                  <span className="truncate text-xs font-medium text-muted-foreground">
                    {formatDate(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Today&apos;s Records</h2>
              <p className="mt-1 text-sm text-muted-foreground">Latest check-ins and statuses</p>
            </div>
            <Clock3 aria-hidden="true" className="size-5 text-brand-sky" />
          </div>

          <RecordList
            records={todayRecords}
            emptyText="No attendance recorded today"
            showDate={false}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Monthly Exceptions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Late, absent, leave, and half-day entries
              </p>
            </div>
            <ShieldAlert aria-hidden="true" className="size-5 text-brand-pink" />
          </div>

          <RecordList records={exceptionRecords} emptyText="No exceptions in this month" showDate />
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Organizations</h2>
              <p className="mt-1 text-sm text-muted-foreground">Largest groups by users</p>
            </div>
            <Building2 aria-hidden="true" className="size-5 text-brand-sky" />
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {topOrganizations.length > 0 ? (
              topOrganizations.map((organization) => (
                <div
                  key={organization.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {organization.name}
                    </p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      {organization.type}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-brand-blue">
                    {organization.users_count ?? 0}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-border bg-secondary p-4 text-sm text-muted-foreground">
                No organizations found.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

type MetricCardProps = {
  icon: typeof Users;
  label: string;
  value: string | number;
  detail: string;
  tone: string;
  isLoading: boolean;
};

function MetricCard({ icon: Icon, label, value, detail, tone, isLoading }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {isLoading ? (
            <div className="mt-3 h-9 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <p className={`mt-2 truncate text-3xl font-bold ${tone}`}>{value}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-brand-sky">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
    </article>
  );
}

function MiniStat({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function RecordList({
  records,
  emptyText,
  showDate,
}: {
  records: Attendance[];
  emptyText: string;
  showDate: boolean;
}) {
  if (records.length === 0) {
    return (
      <div className="flex items-center gap-3 p-5 text-muted-foreground">
        <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {records.map((record) => (
        <div key={record.id ?? `${record.user_id}-${record.attendance_date}`} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {getUserName(record.user)}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {[
                  record.user?.employee_id ?? `User #${record.user_id}`,
                  showDate ? formatDate(record.attendance_date) : null,
                  record.check_in ? `In ${record.check_in}` : null,
                ]
                  .filter(Boolean)
                  .join(" - ")}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold capitalize ${statusClassName(
                record.status,
              )}`}
            >
              {statusLabel(record.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
