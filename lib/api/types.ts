export type ApiEnvelope<TData = unknown> = {
  status: boolean;
  message?: string;
  data?: TData;
  errors?: Record<string, string[]>;
  month?: string | null;
  action?: AttendanceAction;
};

export type ApiSuccess<TData = unknown> = ApiEnvelope<TData> & {
  status: true;
  data: TData;
};

export type ApiFailure<TData = unknown> = ApiEnvelope<TData> & {
  status: false;
  message: string;
};

export type User = {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string | null;
  phone_no: string | null;
  device_id: string | null;
  profile_image: string | null;
  organization_id: number;
  organization?: Organization | null;
  name: string;
  created_at: string;
  updated_at: string;
  attendances?: Attendance[];
};

export type OrganizationType = "company" | "university" | "school" | "organization";

export type Organization = {
  id: number;
  name: string;
  type: OrganizationType;
  timing?: OrganizationTiming | null;
  users_count?: number;
  created_at: string;
  updated_at: string;
};

export type OrganizationTiming = {
  id?: number;
  organization_id: number;
  check_in_start: string;
  check_in_end: string;
  late_after: string;
  check_out_start: string;
  created_at?: string;
  updated_at?: string;
};

export type OrganizationPayload = {
  name: string;
  type: OrganizationType;
};

export type UpdateOrganizationPayload = Partial<OrganizationPayload>;

export type OrganizationTimingPayload = Partial<
  Pick<
    OrganizationTiming,
    "check_in_start" | "check_in_end" | "late_after" | "check_out_start"
  >
>;

export type LoginPayload = {
  phone_no: string;
  password: string;
};

export type LoginUser = {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string | null;
  phone_no: string | null;
  isAdmin: boolean;
  organization_id: number;
  organization?: Organization | null;
};

export type AttendanceStatus = "present" | "absent" | "late" | "half_day";

export type AttendanceAction =
  | "check_in"
  | "check_out"
  | "completed"
  | "check_in_closed"
  | "check_out_closed";

export type Attendance = {
  id: number | null;
  user_id: number;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
  user?: User;
};

export type UserPayload = {
  employee_id: string;
  first_name: string;
  last_name?: string | null;
  phone_no?: string | null;
  device_id?: string | null;
  profile_image?: string | null;
  organization_id: number;
};

export type UpdateUserPayload = Partial<UserPayload>;

export type MarkAttendancePayload = {
  user_id: string;
};

export type AttendanceQuery = {
  month?: string;
  viewer_employee_id?: string;
  admin_employee_id?: string;
};

export type UpdateAttendancePayload = {
  attendance_date?: string;
  check_in?: string | null;
  check_out?: string | null;
  status?: AttendanceStatus;
};
