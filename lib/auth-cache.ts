import type { LoginUser } from "@/lib/api";

const AUTH_CACHE_KEY = "nielit-auth-cache";
const ADMIN_USER_KEY = "nielit-admin-user";
const REMEMBER_SESSION_KEY = "nielit-remember-session";
const VIEWER_EMPLOYEE_ID_KEY = "nielit-viewer-employee-id";
const ORGANIZATION_NAME_KEY = "nielit-organization-name";
const ORGANIZATION_ID_KEY = "nielit-organization-id";

export type CachedAuth = {
  user: LoginUser;
  remembered: boolean;
  cachedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCachedAuth(value: unknown): value is CachedAuth {
  if (!isRecord(value)) {
    return false;
  }

  const { user, remembered, cachedAt } = value;

  if (!isRecord(user)) {
    return false;
  }

  return (
    typeof user.id === "number" &&
    typeof user.employee_id === "string" &&
    user.employee_id.trim().length > 0 &&
    typeof user.organization_id === "number" &&
    typeof remembered === "boolean" &&
    typeof cachedAt === "string" &&
    !Number.isNaN(Date.parse(cachedAt))
  );
}

export function cacheOrganizationName(
  organizationId: number,
  organizationName: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ORGANIZATION_NAME_KEY, organizationName);
  window.localStorage.setItem(ORGANIZATION_ID_KEY, String(organizationId));
}

export function getCachedOrganizationName(organizationId: number) {
  if (typeof window === "undefined") {
    return null;
  }

  const storedName = window.localStorage.getItem(ORGANIZATION_NAME_KEY);
  const storedId = window.localStorage.getItem(ORGANIZATION_ID_KEY);

  if (!storedName || !storedId) {
    return null;
  }

  if (Number(storedId) !== organizationId) {
    return null;
  }

  return storedName;
}

export function cacheLoginResponse(user: LoginUser, remembered: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const cachedAuth: CachedAuth = {
    user,
    remembered,
    cachedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cachedAuth));
  window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  window.localStorage.setItem(REMEMBER_SESSION_KEY, String(remembered));
  window.localStorage.setItem(VIEWER_EMPLOYEE_ID_KEY, user.employee_id);
  window.localStorage.setItem(
    ORGANIZATION_ID_KEY,
    String(user.organization_id),
  );
}

export function getCachedAuth(): CachedAuth | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cachedValue = window.localStorage.getItem(AUTH_CACHE_KEY);

  if (!cachedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(cachedValue);

    if (!isCachedAuth(parsedValue)) {
      clearCachedAuth();
      return null;
    }

    return parsedValue;
  } catch {
    clearCachedAuth();
    return null;
  }
}

export function clearCachedAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_CACHE_KEY);
  window.localStorage.removeItem(ADMIN_USER_KEY);
  window.localStorage.removeItem(REMEMBER_SESSION_KEY);
  window.localStorage.removeItem(VIEWER_EMPLOYEE_ID_KEY);
  window.localStorage.removeItem(ORGANIZATION_NAME_KEY);
  window.localStorage.removeItem(ORGANIZATION_ID_KEY);
}
