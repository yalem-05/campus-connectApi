export type UserRole = "Admin" | "Student" | "Faculty" | "Staff";

export interface User {
  id: number;
  guid: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
  last_login_date?: string;
  student_id?: number;
  faculty_id?: number;
  created_date: string;
  modified_date?: string;
  is_active: boolean;
}

export interface Student {
  id: number;
  guid: string;
  student_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  email: string;
  phone_number?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  enrollment_date: string;
  enrollment_status: "Active" | "Inactive" | "Graduated" | "Suspended" | "Withdrawn";
  department_id?: number;
  created_date: string;
  modified_date?: string;
  is_active: boolean;
}

export interface Faculty {
  id: number;
  guid: string;
  faculty_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  date_of_birth: string;
  hire_date: string;
  designation: "Professor" | "Associate Professor" | "Assistant Professor" | "Lecturer";
  qualification?: string;
  specialization?: string;
  salary?: number;
  status: "Active" | "On Leave" | "Retired" | "Terminated";
  department_id?: number;
  created_date: string;
  modified_date?: string;
  is_active: boolean;
}

export interface Department {
  id: number;
  guid: string;
  department_code: string;
  department_name: string;
  description?: string;
  head_of_department?: string;
  contact_email?: string;
  contact_phone?: string;
  created_date: string;
  modified_date?: string;
  is_active: boolean;
}

export interface LoginHistory {
  id: number;
  user_id: number;
  login_date: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
}

export interface AuthRequest extends Express.Request {
  user?: {
    id: number;
    role: UserRole;
    email: string;
  };
}