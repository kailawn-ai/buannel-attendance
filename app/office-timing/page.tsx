"use client";

import { AlertCircle, Clock, Loader2, Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getCachedAuth, getCachedOrganizationName } from "@/lib/auth-cache";
import {
  attendanceApi,
  LaravelApiError,
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
  const [cachedAuth] = useState(() => getCachedAuth());
  const organizationId = cachedAuth?.user.organization_id
    ? String(cachedAuth.user.organization_id)
    : "";
  const organizationName =
    cachedAuth?.user.organization?.name ??
    (cachedAuth?.user.organization_id
      ? getCachedOrganizationName(cachedAuth.user.organization_id)
      : null) ??
    (organizationId
      ? `Organization #${organizationId}`
      : "No organization cached");
  const organizationType =
    cachedAuth?.user.organization?.type ?? "organization";
  const [timing, setTiming] = useState<OrganizationTiming | null>(null);
  const [form, setForm] = useState<TimingForm>(defaultTimingForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimingLoading, setIsTimingLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => timingOrderError(form), [form]);

  useEffect(() => {
    let isMounted = true;

    if (!organizationId) {
      setError("No cached organization was found. Please log in again.");
      setIsLoading(false);

      return () => {
        isMounted = false;
      };
    }

    attendanceApi.organizations.timing
      .show(organizationId)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setTiming(response.data);
        setForm(toForm(response.data));
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
  }, [organizationId]);

  function updateField(field: keyof TimingForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!organizationId || validationError) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await attendanceApi.organizations.timing.update(
        organizationId,
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
            <p className="text-sm font-semibold text-brand-sky">
              Office Timing
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              Timing Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage organization-specific check-in, late, and check-out windows
              used by the attendance API.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        {error ? (
          <div className="flex items-start gap-3 border-b border-border p-6 text-destructive">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0"
            />
            <div>
              <p className="text-sm font-semibold">Could not load timing</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : null}

        {isLoading || isTimingLoading ? (
          <div className="grid gap-4 p-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-md bg-muted"
              />
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
                    {organizationName}
                  </h2>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {organizationType} timing profile
                  </p>
                </div>
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
                    onChange={(event) =>
                      updateField(field.key, event.target.value)
                    }
                    required
                    className="h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25 [&::-webkit-calendar-picker-indicator]:size-6 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <span className="text-xs leading-5 text-muted-foreground">
                    {field.caption}
                  </span>
                </label>
              ))}
            </div>

            {validationError ? (
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0"
                />
                <p className="text-sm font-semibold">{validationError}</p>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="submit"
                disabled={
                  isSaving || Boolean(validationError) || !organizationId
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
