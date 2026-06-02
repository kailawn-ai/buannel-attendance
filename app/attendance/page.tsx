"use client";

import {
  AlertCircle,
  CalendarCheck,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  attendanceApi,
  LaravelApiError,
  type Attendance,
  type AttendanceSummary,
  type AttendanceStatus,
  type CreateAttendancePayload,
  type UpdateAttendancePayload,
} from "@/lib/api";

type AttendanceMode = "all" | "month" | "user";

type AttendanceForm = {
  attendance_date: string;
  check_in: string;
  check_out: string;
  status: AttendanceStatus;
  remark: string;
};

const statusOptions: AttendanceStatus[] = ["present", "absent", "late", "half_day", "leave"];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getUserName(record: Attendance) {
  return record.user?.name || [record.user?.first_name, record.user?.last_name].filter(Boolean).join(" ");
}

function getOrganizationName(record: Attendance) {
  return record.user?.organization?.name ?? null;
}

function getErrorMessage(caughtError: unknown) {
  return caughtError instanceof LaravelApiError
    ? caughtError.message
    : "Unable to complete the request. Please check the backend API.";
}

function toForm(record: Attendance): AttendanceForm {
  return {
    attendance_date: record.attendance_date,
    check_in: record.check_in ?? "",
    check_out: record.check_out ?? "",
    status: record.status,
    remark: record.remark ?? "",
  };
}

function toPayload(form: AttendanceForm): UpdateAttendancePayload {
  return {
    attendance_date: form.attendance_date,
    check_in: form.check_in.trim() || null,
    check_out: form.check_out.trim() || null,
    status: form.status,
    remark: form.remark.trim() || null,
  };
}

function toCreatePayload(record: Attendance, form: AttendanceForm): CreateAttendancePayload {
  return {
    user_id: record.user_id,
    attendance_date: form.attendance_date,
    check_in: form.check_in.trim() || null,
    check_out: form.check_out.trim() || null,
    status: form.status,
    remark: form.remark.trim() || null,
  };
}

function attendanceRecordKey(record: Attendance) {
  return record.id === null ? `${record.user_id}-${record.attendance_date}` : String(record.id);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
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

function formatSalaryCut(record: Attendance) {
  if (record.salary_cut === undefined || record.salary_cut === null) {
    return "-";
  }

  const currency = record.user?.staffDetail?.salary_currency || "INR";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(record.salary_cut);
  } catch {
    return `${currency} ${record.salary_cut.toFixed(2)}`;
  }
}

function formatSummaryCurrency(value: number | null | undefined, records: Attendance[]) {
  if (value === undefined || value === null) {
    return "-";
  }

  const currency = records.find((record) => record.user?.staffDetail?.salary_currency)?.user?.staffDetail?.salary_currency || "INR";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatAnnualLeave(summary: AttendanceSummary) {
  if (summary.annual_leave_limit <= 0) {
    return `${summary.annual_leave_taken} / Unlimited`;
  }

  return `${summary.annual_leave_taken} / ${summary.annual_leave_limit}`;
}

function formatAnnualLeaveRemaining(summary: AttendanceSummary) {
  if (summary.annual_leave_remaining === null) {
    return "Unlimited";
  }

  return summary.annual_leave_remaining;
}

async function loadAttendanceRecords(mode: AttendanceMode, employeeId: string, month: string) {
  if (mode === "all") {
    return attendanceApi.attendance.admin();
  }

  if (mode === "month") {
    return attendanceApi.attendance.admin({ month });
  }

  return attendanceApi.attendance.byUser(employeeId.trim(), { month });
}

export default function AttendancePage() {
  const [mode, setMode] = useState<AttendanceMode>("all");
  const [month, setMonth] = useState(getCurrentMonth);
  const [employeeId, setEmployeeId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [records, setRecords] = useState<Attendance[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [editForm, setEditForm] = useState<AttendanceForm | null>(null);
  const [savingRecordKey, setSavingRecordKey] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(
    async ({
      silent = false,
      nextMode = mode,
      nextEmployeeId = employeeId,
      nextMonth = month,
    }: {
      silent?: boolean;
      nextMode?: AttendanceMode;
      nextEmployeeId?: string;
      nextMonth?: string;
    } = {}) => {
      if (nextMode === "user" && !nextEmployeeId.trim()) {
        setError("Enter an employee ID to load user attendance.");
        setRecords([]);
        setAttendanceSummary(null);
        return;
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const response = await loadAttendanceRecords(nextMode, nextEmployeeId, nextMonth);

        setRecords(response.data);
        setAttendanceSummary(nextMode === "user" ? response.summary ?? null : null);
      } catch (caughtError) {
        const message = getErrorMessage(caughtError);
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [employeeId, mode, month],
  );

  function selectMode(nextMode: AttendanceMode) {
    setMode(nextMode);
    void fetchAttendance({ silent: true, nextMode });
  }

  useEffect(() => {
    let isMounted = true;

    const searchParams = new URLSearchParams(window.location.search);
    const queryEmployeeId = searchParams.get("employee_id") ?? searchParams.get("employeeId") ?? "";
    const queryMonth = searchParams.get("month") ?? getCurrentMonth();
    const queryMode = searchParams.get("mode");
    const initialMode: AttendanceMode =
      queryMode === "user" || queryEmployeeId ? "user" : queryMode === "month" ? "month" : "all";

    setMode(initialMode);
    setEmployeeId(queryEmployeeId);
    setMonth(queryMonth);

    if (initialMode === "user" && !queryEmployeeId.trim()) {
      setError("Enter an employee ID to load user attendance.");
      setRecords([]);
      setAttendanceSummary(null);
      setIsLoading(false);

      return () => {
        isMounted = false;
      };
    }

    loadAttendanceRecords(initialMode, queryEmployeeId, queryMonth)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setRecords(response.data);
        setAttendanceSummary(initialMode === "user" ? response.summary ?? null : null);
        setError(null);
      })
      .catch((caughtError: unknown) => {
        if (!isMounted) {
          return;
        }

        const message = getErrorMessage(caughtError);
        setError(message);
        toast.error(message);
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

  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return records;
    }

    return records.filter((record) => {
      const values = [
        getUserName(record),
        record.user?.employee_id,
        getOrganizationName(record),
        record.attendance_date,
        record.status,
        record.check_in,
        record.check_out,
        record.remark,
      ].filter((value): value is string => Boolean(value));

      return values.some((value) => value.toLowerCase().includes(query));
    });
  }, [records, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: records.length,
      present: records.filter((record) => record.status === "present").length,
      late: records.filter((record) => record.status === "late").length,
      absent: records.filter((record) => record.status === "absent").length,
      leave: records.filter((record) => record.status === "leave").length,
    };
  }, [records]);

  function startEdit(record: Attendance) {
    setEditingRecord(record);
    setEditForm(toForm(record));
    setError(null);
  }

  async function saveAttendance() {
    if (!editingRecord || !editForm) {
      return;
    }

    const recordKey = attendanceRecordKey(editingRecord);

    setSavingRecordKey(recordKey);
    setError(null);

    try {
      const response =
        editingRecord.id === null
          ? await attendanceApi.attendance.create(toCreatePayload(editingRecord, editForm))
          : await attendanceApi.attendance.update(editingRecord.id, toPayload(editForm));

      setRecords((currentRecords) =>
        currentRecords.map((record) =>
          attendanceRecordKey(record) === recordKey
            ? { ...response.data, user: response.data.user ?? record.user }
            : record,
        ),
      );
      setEditingRecord(null);
      setEditForm(null);
      toast.success(
        editingRecord.id === null
          ? "Attendance created successfully"
          : "Attendance updated successfully",
      );
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setError(message);
      toast.error(message);
    } finally {
      setSavingRecordKey(null);
    }
  }

  async function deleteAttendance(record: Attendance) {
    if (record.id === null) {
      return;
    }

    const shouldDelete = window.confirm(`Delete attendance for ${getUserName(record) || "this user"}?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingRecordId(record.id);
    setError(null);

    try {
      await attendanceApi.attendance.delete(record.id);
      setRecords((currentRecords) =>
        currentRecords
          .map((currentRecord) =>
            currentRecord.id === record.id && mode === "user"
              ? {
                  ...currentRecord,
                  id: null,
                  check_in: null,
                  check_out: null,
                  status: "absent" as const,
                  remark: null,
                }
              : currentRecord,
          )
          .filter((currentRecord) => mode === "user" || currentRecord.id !== record.id),
      );

      if (editingRecord?.id === record.id) {
        setEditingRecord(null);
        setEditForm(null);
      }

      toast.success("Attendance deleted successfully");
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setError(message);
      toast.error(message);
    } finally {
      setDeletingRecordId(null);
    }
  }

  async function downloadExcelReport() {
    if (mode === "all") {
      return;
    }

    if (filteredRecords.length === 0) {
      toast.info("No attendance records available to export.");
      return;
    }

    try {
      if (mode === "month") {
        await attendanceApi.attendance.adminExcel({ month });
      } else {
        await attendanceApi.attendance.byUserExcel(employeeId.trim(), { month });
      }

      toast.success("Excel download started.");
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-sky">Attendance</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">Attendance Management</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Review today&apos;s entries, monthly records, individual history, and correct attendance
              exceptions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-md border border-border bg-secondary px-3 py-2">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary px-3 py-2">
              <p className="text-xs text-muted-foreground">Present</p>
              <p className="text-lg font-bold text-success">{stats.present}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary px-3 py-2">
              <p className="text-xs text-muted-foreground">Late</p>
              <p className="text-lg font-bold text-brand-pink">{stats.late}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary px-3 py-2">
              <p className="text-xs text-muted-foreground">Absent</p>
              <p className="text-lg font-bold text-destructive">{stats.absent}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary px-3 py-2">
              <p className="text-xs text-muted-foreground">Leave</p>
              <p className="text-lg font-bold text-brand-sky">{stats.leave}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border p-4">
          <div className="flex w-full flex-nowrap gap-1 sm:w-auto sm:gap-2">
            {([
              ["all", "All Records"],
              ["month", "Monthly"],
              ["user", "User History"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => selectMode(value)}
                className={`h-9 min-w-0 flex-1 whitespace-nowrap rounded-md px-2 text-[11px] font-semibold transition-colors sm:h-10 sm:flex-none sm:px-4 sm:text-sm ${
                  mode === value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-foreground hover:bg-secondary hover:text-secondary-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
            <label className="relative block w-full">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search employee, organization, date, status, check-in, check-out"
                className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              {mode !== "all" ? (
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              ) : null}

              {mode === "user" ? (
                <input
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                  placeholder="Employee ID"
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {mode !== "all" ? (
                <button
                  type="button"
                  onClick={() => void downloadExcelReport()}
                  disabled={isLoading || filteredRecords.length === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download aria-hidden="true" className="size-4" />
                  Excel
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void fetchAttendance({ silent: true })}
                disabled={isLoading || isRefreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Load Records
              </button>
            </div>
          </div>
        </div>

        {mode === "user" && attendanceSummary ? (
          <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
            <div className="rounded-md border border-border bg-secondary px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Late Duration</p>
              <p className="mt-2 text-lg font-bold text-foreground">
                {attendanceSummary.total_late_duration}
              </p>
            </div>
            <div className="rounded-md border border-border bg-secondary px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Late Minutes</p>
              <p className="mt-2 text-lg font-bold text-brand-pink">
                {attendanceSummary.total_late_minutes}
              </p>
            </div>
            <div className="rounded-md border border-border bg-secondary px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Late Seconds</p>
              <p className="mt-2 text-lg font-bold text-foreground">
                {attendanceSummary.total_late_seconds}
              </p>
            </div>
            <div className="rounded-md border border-border bg-secondary px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Salary Cut</p>
              <p className="mt-2 text-lg font-bold text-destructive">
                {formatSummaryCurrency(attendanceSummary.total_salary_cut, records)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-secondary px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Payable Salary</p>
              <p className="mt-2 text-lg font-bold text-success">
                {formatSummaryCurrency(attendanceSummary.payable_salary, records)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-secondary px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Leave Days</p>
              <p className="mt-2 text-lg font-bold text-foreground">
                {attendanceSummary.leave_days}
              </p>
            </div>
            <div className="rounded-md border border-border bg-secondary px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Annual Leave</p>
              <p className="mt-2 text-lg font-bold text-foreground">
                {formatAnnualLeave(attendanceSummary)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Remaining {formatAnnualLeaveRemaining(attendanceSummary)}
              </p>
            </div>
          </div>
        ) : null}

        {editingRecord && editForm ? (
          <div className="border-b border-border p-4">
            <div className="flex flex-col gap-4 rounded-md border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {editingRecord.id === null ? "Add Attendance" : "Edit Attendance"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getUserName(editingRecord) || "Employee"} - {formatDate(editingRecord.attendance_date)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord(null);
                    setEditForm(null);
                  }}
                  aria-label="Close edit form"
                  className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                <input
                  type="date"
                  value={editForm.attendance_date}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, attendance_date: event.target.value } : current,
                    )
                  }
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
                <input
                  value={editForm.check_in}
                  onChange={(event) =>
                    setEditForm((current) => (current ? { ...current, check_in: event.target.value } : current))
                  }
                  placeholder="09:30:00 AM"
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
                <input
                  value={editForm.check_out}
                  onChange={(event) =>
                    setEditForm((current) => (current ? { ...current, check_out: event.target.value } : current))
                  }
                  placeholder="04:30:00 PM"
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
                <select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, status: event.target.value as AttendanceStatus } : current,
                    )
                  }
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void saveAttendance()}
                  disabled={savingRecordKey !== null}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save aria-hidden="true" className="size-4" />
                  {savingRecordKey !== null ? "Saving" : "Save"}
                </button>
              </div>
              <textarea
                value={editForm.remark}
                onChange={(event) =>
                  setEditForm((current) => (current ? { ...current, remark: event.target.value } : current))
                }
                placeholder="Remark"
                rows={3}
                className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 p-6 text-destructive">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Could not load attendance</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : (
          <div className="themed-scrollbar overflow-x-auto">
            <table className="w-full min-w-[1240px] border-collapse text-left">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Check In</th>
                  <th className="px-4 py-3 font-semibold">Check Out</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Remark</th>
                  <th className="px-4 py-3 font-semibold">Late Time</th>
                  <th className="px-4 py-3 font-semibold">Salary Cut</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({ length: 9 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <tr
                      key={record.id ?? `${record.user_id}-${record.attendance_date}`}
                      className="transition-colors hover:bg-secondary/60"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                            <CalendarCheck aria-hidden="true" className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {getUserName(record) || "Unknown User"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[record.user?.employee_id ?? `User #${record.user_id}`, getOrganizationName(record)]
                                .filter(Boolean)
                                .join(" - ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatDate(record.attendance_date)}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-foreground">
                        {record.check_in ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-foreground">
                        {record.check_out ?? "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold capitalize ${statusClassName(
                              record.status,
                            )}`}
                          >
                            {record.status.replace("_", " ")}
                          </span>
                          {record.status === "leave" &&
                          (record.unpaid_leave !== undefined || record.paid_leave !== undefined) ? (
                            <span className="text-xs font-medium text-muted-foreground">
                              {record.unpaid_leave ?? record.paid_leave ? "Unpaid" : "Paid"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="max-w-56 px-4 py-4 text-sm text-muted-foreground">
                        <span className="line-clamp-2">{record.remark || "-"}</span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-foreground">
                        {record.late_duration
                          ? `${record.late_duration} (${record.late_minutes ?? 0} min)`
                          : "-"}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-foreground">
                        {formatSalaryCut(record)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {record.id === null ? (
                            <button
                              type="button"
                              onClick={() => startEdit(record)}
                              aria-label="Add attendance"
                              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold text-brand-sky transition-colors hover:bg-brand-sky hover:text-white"
                            >
                              <Plus aria-hidden="true" className="size-4" />
                              Add
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(record)}
                                aria-label="Edit attendance"
                                className="grid size-9 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                              >
                                <Pencil aria-hidden="true" className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteAttendance(record)}
                                disabled={deletingRecordId === record.id}
                                aria-label="Delete attendance"
                                className="grid size-9 place-items-center rounded-md border border-border bg-background text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 aria-hidden="true" className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <p className="text-sm font-semibold text-foreground">No attendance found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Change the filter or load another attendance view.
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
