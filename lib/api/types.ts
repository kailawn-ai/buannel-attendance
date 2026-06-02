export type ApiEnvelope<TData = unknown> = {
  status: boolean;
  message?: string;
  data?: TData;
  errors?: Record<string, string[]>;
  month?: string | null;
  action?: AttendanceAction;
  summary?: AttendanceSummary;
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
  staffDetail?: StaffDetail | null;
  staff_detail?: StaffDetail | null;
  attendances?: Attendance[];
};

export type OrganizationType = "company" | "university" | "school" | "organization";

export type Organization = {
  id: number;
  name: string;
  type: OrganizationType;
  timing?: OrganizationTiming | null;
  attendance_policy?: OrganizationAttendancePolicy | null;
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
  half_day_after: string;
  check_out_start: string;
  created_at?: string;
  updated_at?: string;
};

export type OrganizationAttendancePolicy = {
  id?: number;
  organization_id: number;
  allow_half_day: boolean;
  allow_leave: boolean;
  annual_leave_limit: number;
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
    | "check_in_start"
    | "check_in_end"
    | "late_after"
    | "half_day_after"
    | "check_out_start"
  >
>;

export type OrganizationAttendancePolicyPayload = Partial<
  Pick<
    OrganizationAttendancePolicy,
    "allow_half_day" | "allow_leave" | "annual_leave_limit"
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
  access_token?: string | null;
};

export type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "leave";

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
  remark: string | null;
  created_at: string;
  updated_at: string;
  late_seconds?: number;
  late_minutes?: number;
  late_duration?: string;
  salary_cut?: number;
  paid_leave?: boolean;
  unpaid_leave?: boolean;
  salary_cut_applied?: boolean;
  user?: User;
};

export type AttendanceSummary = {
  total_late_seconds: number;
  total_late_minutes: number;
  total_late_duration: string;
  total_salary_cut: number;
  leave_days: number;
  annual_leave_taken: number;
  annual_leave_limit: number;
  annual_leave_remaining: number | null;
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

export type StaffDetailPayload = {
  position?: string | null;
  department?: string | null;
  join_date?: string | null;
  salary?: number | null;
  salary_currency?: string | null;
  salary_frequency?: string | null;
  notes?: string | null;
};

export type UpdateUserPayload = Partial<UserPayload> & {
  staff_detail?: StaffDetailPayload;
};

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
  remark?: string | null;
};

export type CreateAttendancePayload = {
  user_id: number;
  attendance_date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: AttendanceStatus;
  remark?: string | null;
};

export type StaffDetail = {
  id: number;
  user_id: number;
  position: string | null;
  department: string | null;
  join_date: string;
  salary: number | null;
  salary_currency: string | null;
  salary_frequency: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};
