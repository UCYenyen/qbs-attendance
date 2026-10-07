import type { Enums, Tables } from "@/types/database"

export type UserRole = Enums<"user_role">

export type Profile = Tables<"profiles">

/** The signed-in user, resolved on the server from verified JWT claims + profile row. */
export interface CurrentUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  avatarUrl: string | null
}

export interface InviteEmployeeInput {
  email: string
  fullName: string
}

export interface UpdateRoleInput {
  userId: string
  role: UserRole
}
