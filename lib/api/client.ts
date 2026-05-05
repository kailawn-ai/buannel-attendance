import type {
  ApiEnvelope,
  ApiFailure,
  ApiSuccess,
  Attendance,
  AttendanceQuery,
  LoginPayload,
  LoginUser,
  MarkAttendancePayload,
  Organization,
  OrganizationPayload,
  UpdateOrganizationPayload,
  UpdateAttendancePayload,
  UpdateUserPayload,
  User,
  UserPayload,
} from "./types";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api";

type QueryValue = string | number | boolean | null | undefined;
type ViewerQuery = Pick<AttendanceQuery, "viewer_employee_id" | "admin_employee_id">;

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
  query?: Record<string, QueryValue>;
};

export class LaravelApiError<TData = unknown> extends Error {
  statusCode: number;
  payload: ApiFailure<TData> | null;

  constructor(statusCode: number, payload: ApiFailure<TData> | null, fallback: string) {
    super(payload?.message ?? fallback);
    this.name = "LaravelApiError";
    this.statusCode = statusCode;
    this.payload = payload;
  }

  get validationErrors() {
    return this.payload?.errors ?? {};
  }
}

function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${getApiBaseUrl()}${normalizedPath}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function isJsonBody(body: ApiRequestOptions["body"]): body is Record<string, unknown> {
  return Object.prototype.toString.call(body) === "[object Object]";
}

function getStoredViewerQuery(): ViewerQuery {
  if (typeof window === "undefined") {
    return {};
  }

  const employeeId = window.localStorage.getItem("nielit-viewer-employee-id");

  return employeeId ? { viewer_employee_id: employeeId } : {};
}

function includeViewerQuery(query: AttendanceQuery | ViewerQuery = {}): Record<string, QueryValue> {
  return {
    ...getStoredViewerQuery(),
    ...query,
  };
}

async function readJson<T>(response: Response): Promise<T | null> {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

export async function apiRequest<TData>(
  path: string,
  { body, headers, query, ...init }: ApiRequestOptions = {},
): Promise<ApiSuccess<TData>> {
  const shouldSerializeJson = isJsonBody(body);
  const requestBody = shouldSerializeJson ? JSON.stringify(body) : body;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  if (requestBody && shouldSerializeJson && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, query), {
    cache: "no-store",
    ...init,
    headers: requestHeaders,
    body: requestBody,
  });
  const payload = await readJson<ApiEnvelope<TData>>(response);

  if (!response.ok || payload?.status === false) {
    throw new LaravelApiError(
      response.status,
      payload?.status === false ? (payload as ApiFailure<TData>) : null,
      response.statusText || "API request failed",
    );
  }

  return {
    status: true,
    ...(payload ?? {}),
  } as ApiSuccess<TData>;
}

export const attendanceApi = {
  auth: {
    login: (payload: LoginPayload) =>
      apiRequest<LoginUser>("/attendance/login", {
        method: "POST",
        body: payload,
      }),
  },
  users: {
    list: (query: ViewerQuery = {}) =>
      apiRequest<User[]>("/attendance/users", { query: includeViewerQuery(query) }),
    create: (payload: UserPayload, query: ViewerQuery = {}) =>
      apiRequest<User>("/attendance/users", {
        method: "POST",
        body: payload,
        query: includeViewerQuery(query),
      }),
    show: (id: number | string, query: ViewerQuery = {}) =>
      apiRequest<User>(`/attendance/users/${id}`, { query: includeViewerQuery(query) }),
    update: (id: number | string, payload: UpdateUserPayload, query: ViewerQuery = {}) =>
      apiRequest<User>(`/attendance/users/${id}`, {
        method: "PATCH",
        body: payload,
        query: includeViewerQuery(query),
      }),
    delete: (id: number | string, query: ViewerQuery = {}) =>
      apiRequest<never>(`/attendance/users/${id}`, {
        method: "DELETE",
        query: includeViewerQuery(query),
      }),
  },
  organizations: {
    list: () => apiRequest<Organization[]>("/attendance/organizations"),
    create: (payload: OrganizationPayload) =>
      apiRequest<Organization>("/attendance/organizations", {
        method: "POST",
        body: payload,
      }),
    show: (id: number | string) => apiRequest<Organization>(`/attendance/organizations/${id}`),
    update: (id: number | string, payload: UpdateOrganizationPayload) =>
      apiRequest<Organization>(`/attendance/organizations/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    delete: (id: number | string) =>
      apiRequest<never>(`/attendance/organizations/${id}`, {
        method: "DELETE",
      }),
  },
  attendance: {
    mark: (payload: MarkAttendancePayload) =>
      apiRequest<Attendance>("/attendance", {
        method: "POST",
        body: payload,
      }),
    today: (query: ViewerQuery = {}) =>
      apiRequest<Attendance[]>("/attendance/today", { query: includeViewerQuery(query) }),
    admin: (query: AttendanceQuery = {}) =>
      apiRequest<Attendance[]>("/attendance/admin", {
        query: includeViewerQuery(query),
      }),
    byUser: (employeeId: string, query: AttendanceQuery = {}) =>
      apiRequest<Attendance[]>(`/attendance/user/${employeeId}`, {
        query: includeViewerQuery(query),
      }),
    update: (id: number | string, payload: UpdateAttendancePayload, query: ViewerQuery = {}) =>
      apiRequest<Attendance>(`/attendance/update/${id}`, {
        method: "PUT",
        body: payload,
        query: includeViewerQuery(query),
      }),
    delete: (id: number | string, query: ViewerQuery = {}) =>
      apiRequest<never>(`/attendance/delete/${id}`, {
        method: "DELETE",
        query: includeViewerQuery(query),
      }),
  },
};
