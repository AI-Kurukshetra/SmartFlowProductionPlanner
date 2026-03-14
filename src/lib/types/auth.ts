export type UserRole = "admin" | "planner" | "supervisor" | "operator";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  organization_id: string | null;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  industry: string | null;
  created_at: string;
}
