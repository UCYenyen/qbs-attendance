import type { Enums, Tables } from "@/types/database"

export type UserRole = Enums<"user_role">

export type Profile = Tables<"profiles">

/** The signed-in user, resolved on the server from verified JWT claims + profile row. */
export interface CurrentUser {
  id: string
  /** Auth email; a placeholder address when the account has no real email. */
  email: string
  username: string | null
  fullName: string
  role: UserRole
  avatarUrl: string | null
  mustChangePassword: boolean
}

/** Owner-created account: username + default password, email optional. */
export interface CreateEmployeeInput {
  fullName: string
  username: string
  password: string
  email: string | null
}

export interface ResetPasswordInput {
  userId: string
  password: string
}

export interface ChangePasswordInput {
  currentPassword: string
  password: string
  confirm: string
}

export interface UpdateRoleInput {
  userId: string
  role: UserRole
}
