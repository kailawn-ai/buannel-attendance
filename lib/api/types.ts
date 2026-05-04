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
  name: string;
  created_at: string;
  updated_at: string;
  attendances?: Attendance[];
};

export type AttendanceStatus = "present" | "absent" | "late" | "half_day";

export type AttendanceAction =
  | "check_in"
  | "check_out"
  | "completed"
  | "check_in_closed"
  | "check_out_closed";

export type Attendance = {
  id: number;
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
};

export type UpdateUserPayload = Partial<UserPayload>;

export type MarkAttendancePayload = {
  user_id: string;
};

export type AttendanceQuery = {
  month?: string;
};

export type UpdateAttendancePayload = {
  attendance_date?: string;
  check_in?: string | null;
  check_out?: string | null;
  status?: AttendanceStatus;
};
