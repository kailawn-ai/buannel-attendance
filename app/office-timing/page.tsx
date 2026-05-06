"use client";

import {
  AlertCircle,
  Building2,
  Clock,
  Loader2,
  RefreshCw,
  Save,
  TimerReset,
} from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  attendanceApi,
  LaravelApiError,
  type Organization,
  type OrganizationTiming,
  type OrganizationTimingPayload,
} from "@/lib/api";

type TimingForm = {
  check_in_start: string;
  late_after: string;
  check_in_end: string;
  check_out_start: string;
};

const defaultTimingForm: TimingForm = {
  check_in_start: "09:00",
  late_after: "09:30",
  check_in_end: "10:00",
  check_out_start: "16:00",
};

const timingFields: Array<{
  key: keyof TimingForm;
  label: string;
  caption: string;
}> = [
  {
    key: "check_in_start",
    label: "Check-in Opens",
    caption: "Employees can begin marking attendance.",
  },
  {
    key: "late_after",
    label: "Late After",
    caption: "Check-ins after this time are late.",
  },
  {
    key: "check_in_end",
    label: "Check-in Closes",
    caption: "Check-in requests close for the day.",
  },
  {
    key: "check_out_start",
    label: "Check-out Opens",
    caption: "Employees can start checking out.",
  },
];

function getErrorMessage(caughtError: unknown) {
  return caughtError instanceof LaravelApiError
    ? caughtError.message
    : "Unable to complete the request. Please check the backend API.";
}

function toTimeInput(value?: string | null) {
  return value ? value.slice(0, 5) : "";
}

function toApiTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function toForm(timing: OrganizationTiming): TimingForm {
  return {
    check_in_start: toTimeInput(timing.check_in_start),
    late_after: toTimeInput(timing.late_after),
    check_in_end: toTimeInput(timing.check_in_end),
    check_out_start: toTimeInput(timing.check_out_start),
  };
}

function toPayload(form: TimingForm): OrganizationTimingPayload {
  return {
    check_in_start: toApiTime(form.check_in_start),
    late_after: toApiTime(form.late_after),
    check_in_end: toApiTime(form.check_in_end),
    check_out_start: toApiTime(form.check_out_start),
  };
}

function formatTime(value: string) {
  const [hours = "00", minutes = "00"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function timingOrderError(form: TimingForm) {
  if (form.check_in_start > form.late_after) {
    return "Late time must be after or equal to check-in start time.";
  }

  if (form.late_after > form.check_in_end) {
    return "Late time must be before or equal to check-in close time.";
  }

  return null;
}

export default function OfficeTimingPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [timing, setTiming] = useState<OrganizationTiming | null>(null);
  const [form, setForm] = useState<TimingForm>(defaultTimingForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimingLoading, setIsTimingLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOrganization = useMemo(
    () =>
      organizations.find(
        (organization) => String(organization.id) === selectedOrganizationId,
      ) ?? null,
    [organizations, selectedOrganizationId],
  );

  const validationError = useMemo(() => timingOrderError(form), [form]);

  const loadTiming = useCallback(
    async (organizationId: string, { silent = false } = {}) => {
      if (!organizationId) {
        return;
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsTimingLoading(true);
      }

      setError(null);

      try {
        const response = await attendanceApi.organizations.timing.show(organizationId);
        setTiming(response.data);
        setForm(toForm(response.data));
      } catch (caughtError) {
        const message = getErrorMessage(caughtError);
        setError(message);
        toast.error(message);
      } finally {
        setIsTimingLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  const loadOrganizations = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await attendanceApi.organizations.list();
      const nextOrganizations = response.data;
      const currentOrganizationStillExists = nextOrganizations.some(
        (organization) => String(organization.id) === selectedOrganizationId,
      );
      const nextOrganizationId = currentOrganizationStillExists
        ? selectedOrganizationId
        : nextOrganizations[0]?.id
          ? String(nextOrganizations[0].id)
          : "";

      setOrganizations(nextOrganizations);
      setSelectedOrganizationId(nextOrganizationId);

      if (nextOrganizationId) {
        await loadTiming(nextOrganizationId, { silent });
      } else {
        setTiming(null);
        setForm(defaultTimingForm);
      }
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [loadTiming, selectedOrganizationId]);

  useEffect(() => {
    let isMounted = true;

    attendanceApi.organizations
      .list()
      .then(async (response) => {
        if (!isMounted) {
          return;
        }

        const nextOrganizations = response.data;
        const firstOrganizationId = nextOrganizations[0]?.id
          ? String(nextOrganizations[0].id)
          : "";

        setOrganizations(nextOrganizations);
        setSelectedOrganizationId(firstOrganizationId);

        if (!firstOrganizationId) {
          setTiming(null);
          setForm(defaultTimingForm);
          return;
        }

        const timingResponse =
          await attendanceApi.organizations.timing.show(firstOrganizationId);

        if (!isMounted) {
          return;
        }

        setTiming(timingResponse.data);
        setForm(toForm(timingResponse.data));
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
        setIsTimingLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField(field: keyof TimingForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleOrganizationChange(organizationId: string) {
    setSelectedOrganizationId(organizationId);
    void loadTiming(organizationId);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedOrganizationId || validationError) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await attendanceApi.organizations.timing.update(
        selectedOrganizationId,
        toPayload(form),
      );

      setTiming(response.data);
      setForm(toForm(response.data));
      toast.success("Office timing updated successfully");
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-sky">Office Timing</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              Timing Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage organization-specific check-in, late, and check-out windows
              used by the attendance API.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {timingFields.map((field) => (
              <div
                key={field.key}
                className="rounded-md border border-border bg-secondary px-3 py-2"
              >
                <p className="text-xs text-muted-foreground">{field.label}</p>
                <p className="text-lg font-bold text-foreground">
                  {form[field.key] ? formatTime(form[field.key]) : "-"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <label className="flex w-full flex-col gap-2 md:max-w-md">
            <span className="text-sm font-semibold text-foreground">
              Organization
            </span>
            <div className="relative">
              <Building2
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <select
                value={selectedOrganizationId}
                onChange={(event) => handleOrganizationChange(event.target.value)}
                disabled={isLoading || organizations.length === 0}
                className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {organizations.length === 0 ? (
                  <option value="">No organizations found</option>
                ) : null}
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} ({organization.type})
                  </option>
                ))}
              </select>
            </div>
          </label>

          <button
            type="button"
            onClick={() => void loadOrganizations({ silent: true })}
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

        {error ? (
          <div className="flex items-start gap-3 border-b border-border p-6 text-destructive">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Could not load timing</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : null}

        {isLoading || isTimingLoading ? (
          <div className="grid gap-4 p-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2 rounded-md border border-border bg-secondary p-4 text-secondary-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-md bg-background text-brand-sky">
                  <Clock aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {selectedOrganization?.name ?? "Select an organization"}
                  </h2>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {selectedOrganization?.type ?? "organization"} timing profile
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <TimerReset aria-hidden="true" className="size-4 text-brand-pink" />
                {timing?.updated_at ? `Updated ${formatTime(timing.updated_at.slice(11, 16))}` : "Default schedule"}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {timingFields.map((field) => (
                <label
                  key={field.key}
                  className="flex flex-col gap-2 rounded-md border border-border bg-background p-4"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {field.label}
                  </span>
                  <input
                    type="time"
                    step="60"
                    value={form[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    required
                    className="h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
                  />
                  <span className="text-xs leading-5 text-muted-foreground">
                    {field.caption}
                  </span>
                </label>
              ))}
            </div>

            {validationError ? (
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <p className="text-sm font-semibold">{validationError}</p>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  const nextForm = timing ? toForm(timing) : defaultTimingForm;
                  setForm(nextForm);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                <TimerReset aria-hidden="true" className="size-4" />
                Reset
              </button>
              <button
                type="submit"
                disabled={
                  isSaving ||
                  Boolean(validationError) ||
                  !selectedOrganizationId ||
                  organizations.length === 0
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Save aria-hidden="true" className="size-4" />
                )}
                {isSaving ? "Saving" : "Save Timing"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
