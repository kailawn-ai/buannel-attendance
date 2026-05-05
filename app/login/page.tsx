"use client";

import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Phone,
  Sun,
  Moon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "react-toastify";
import { attendanceApi, LaravelApiError } from "@/lib/api";
import { cacheLoginResponse } from "@/lib/auth-cache";

function getErrorMessage(caughtError: unknown) {
  return caughtError instanceof LaravelApiError
    ? caughtError.message
    : "Unable to sign in. Please check the backend API.";
}

export default function LoginPage() {
  const router = useRouter();
  const [phoneNo, setPhoneNo] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTheme() {
    const nextTheme = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";

    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.classList.toggle("light", nextTheme === "light");
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem("nielit-theme", nextTheme);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await attendanceApi.auth.login({
        phone_no: phoneNo.trim(),
        password,
      });

      cacheLoginResponse(response.data, rememberSession);

      toast.success(response.message ?? "Login successful");
      router.push("/");
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="relative flex min-h-dvh items-center justify-center bg-secondary px-6 py-8 lg:px-10">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-md border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary hover:text-secondary-foreground sm:right-6 sm:top-6"
        >
          <Moon aria-hidden="true" className="theme-icon-moon size-5" />
          <Sun aria-hidden="true" className="theme-icon-sun size-5" />
        </button>

        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-base font-bold text-primary-foreground shadow-sm">
              BS
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-sky">
                Buannel Studio-Attendance
              </p>
              <h2 className="text-2xl font-bold text-foreground">Sign In</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {error}
              </div>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-foreground">
                Phone Number
              </span>
              <span className="relative">
                <Phone
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={phoneNo}
                  onChange={(event) => setPhoneNo(event.target.value)}
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="9000000001"
                  className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-foreground">
                Password
              </span>
              <span className="relative">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter password"
                  className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-11 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  aria-label={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  title={isPasswordVisible ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                >
                  {isPasswordVisible ? (
                    <EyeOff aria-hidden="true" className="size-4" />
                  ) : (
                    <Eye aria-hidden="true" className="size-4" />
                  )}
                </button>
              </span>
            </label>

            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(event) => setRememberSession(event.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              Keep me signed in
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !phoneNo.trim() || !password}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn aria-hidden="true" className="size-4" />
              {isSubmitting ? "Signing In" : "Sign In"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
