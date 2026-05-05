"use client";

import { AlertCircle, ArrowLeft, Loader2, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  attendanceApi,
  LaravelApiError,
  type Organization,
  type UpdateUserPayload,
  type User,
} from "@/lib/api";

type UserForm = {
  employee_id: string;
  first_name: string;
  last_name: string;
  phone_no: string;
  device_id: string;
  profile_image: string;
  organization_id: string;
};

const emptyForm: UserForm = {
  employee_id: "",
  first_name: "",
  last_name: "",
  phone_no: "",
  device_id: "",
  profile_image: "",
  organization_id: "",
};

function getUserName(user: User) {
  return user.name || [user.first_name, user.last_name].filter(Boolean).join(" ");
}

function getErrorMessage(caughtError: unknown) {
  return caughtError instanceof LaravelApiError
    ? caughtError.message
    : "Something went wrong. Please try again.";
}

function toForm(user: User): UserForm {
  return {
    employee_id: user.employee_id,
    first_name: user.first_name,
    last_name: user.last_name ?? "",
    phone_no: user.phone_no ?? "",
    device_id: user.device_id ?? "",
    profile_image: user.profile_image ?? "",
    organization_id: String(user.organization_id),
  };
}

function toPayload(form: UserForm): UpdateUserPayload {
  return {
    employee_id: form.employee_id.trim(),
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim() || null,
    phone_no: form.phone_no.trim() || null,
    device_id: form.device_id.trim() || null,
    profile_image: form.profile_image.trim() || null,
    organization_id: Number(form.organization_id),
  };
}

export default function UpdateUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([attendanceApi.users.show(params.id), attendanceApi.organizations.list()])
      .then(([userResponse, organizationsResponse]) => {
        if (!isMounted) {
          return;
        }

        setUser(userResponse.data);
        setOrganizations(organizationsResponse.data);
        setForm(toForm(userResponse.data));
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
  }, [params.id]);

  function updateField(field: keyof UserForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await attendanceApi.users.update(params.id, toPayload(form));
      setUser(response.data);
      setForm(toForm(response.data));
      toast.success("User updated successfully");
      router.push("/users");
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground">
              <UserRound aria-hidden="true" className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-sky">Users</p>
              <h1 className="mt-1 text-3xl font-bold text-foreground">Update User</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {user ? `${getUserName(user)} - ${user.employee_id}` : "Loading employee profile"}
              </p>
            </div>
          </div>

          <Link
            href="/users"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Users
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Update failed</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-foreground">Employee ID</span>
                <input
                  value={form.employee_id}
                  onChange={(event) => updateField("employee_id", event.target.value)}
                  required
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-foreground">First Name</span>
                <input
                  value={form.first_name}
                  onChange={(event) => updateField("first_name", event.target.value)}
                  required
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-foreground">Last Name</span>
                <input
                  value={form.last_name}
                  onChange={(event) => updateField("last_name", event.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-foreground">Phone</span>
                <input
                  value={form.phone_no}
                  onChange={(event) => updateField("phone_no", event.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-foreground">Device ID</span>
                <input
                  value={form.device_id}
                  onChange={(event) => updateField("device_id", event.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-foreground">Profile Image URL</span>
                <input
                  type="url"
                  value={form.profile_image}
                  onChange={(event) => updateField("profile_image", event.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-foreground">Organization</span>
                <select
                  value={form.organization_id}
                  onChange={(event) => updateField("organization_id", event.target.value)}
                  required
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
                >
                  <option value="" disabled>
                    Select organization
                  </option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name} ({organization.type})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Link
                href="/users"
                className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Save aria-hidden="true" className="size-4" />
                )}
                {isSaving ? "Updating" : "Update User"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
