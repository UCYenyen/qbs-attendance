import { z } from "zod"

import type { LeaveInput, ProofResourceType } from "@/types/attendance"
import type { PushSubscriptionInput } from "@/types/push"
import type { CreateSwapInput, ReviewScheduleInput, ReviewSwapInput, ScheduleDay, Weekday } from "@/types/schedule"
import type {
  ChangePasswordInput,
  CreateEmployeeInput,
  ResetPasswordInput,
  UpdateRoleInput,
  UserRole,
} from "@/types/user"

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const userRoleSchema = z.enum([
  "admin",
  "admin_qr",
  "active_employee",
  "inactive_employee",
]) satisfies z.ZodType<UserRole>

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Masukkan email atau username"),
  password: z.string().min(1, "Masukkan kata sandi"),
})

const passwordSchema = z.string().min(8, "Minimal 8 karakter").max(72, "Maksimal 72 karakter")

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,30}$/, "3–30 karakter: huruf kecil, angka, titik atau garis bawah")

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, "Minimal 8 karakter"),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Kata sandi tidak sama",
  })

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, "Masukkan nama karyawan").max(120),
  username: usernameSchema,
  password: passwordSchema,
  email: z.email("Masukkan alamat email yang valid").toLowerCase().nullable(),
}) satisfies z.ZodType<CreateEmployeeInput>

export const resetPasswordSchema = z.object({
  userId: z.uuid(),
  password: passwordSchema,
}) satisfies z.ZodType<ResetPasswordInput>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Masukkan kata sandi saat ini"),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Kata sandi tidak sama",
  })
  .refine((value) => value.password !== value.currentPassword, {
    path: ["password"],
    message: "Gunakan kata sandi yang berbeda dari sebelumnya",
  }) satisfies z.ZodType<ChangePasswordInput>

export const updateRoleSchema = z.object({
  userId: z.uuid(),
  role: userRoleSchema,
}) satisfies z.ZodType<UpdateRoleInput>

const weekdaySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]) satisfies z.ZodType<Weekday>

export const scheduleDaySchema = z
  .object({
    weekday: weekdaySchema,
    isWorkingDay: z.boolean(),
    startTime: z.string().regex(TIME_PATTERN, "Format JJ:mm"),
    endTime: z.string().regex(TIME_PATTERN, "Format JJ:mm"),
  })
  .refine((day) => !day.isWorkingDay || day.endTime > day.startTime, {
    path: ["endTime"],
    message: "Jam selesai harus setelah jam mulai",
  }) satisfies z.ZodType<ScheduleDay>

export const weeklyScheduleSchema = z
  .array(scheduleDaySchema)
  .length(7)
  .refine((days) => new Set(days.map((day) => day.weekday)).size === 7, "Setiap hari harus diisi sekali")
  .refine((days) => days.some((day) => day.isWorkingDay), "Pilih minimal satu hari kerja")

export const reviewScheduleSchema = z.object({
  requestId: z.uuid(),
  approve: z.boolean(),
  note: z.string().trim().max(500).nullable(),
}) satisfies z.ZodType<ReviewScheduleInput>

const proofResourceTypeSchema = z.enum(["image", "raw", "video"]) satisfies z.ZodType<ProofResourceType>

export const leaveSchema = z.object({
  status: z.enum(["sick", "excused"]),
  workDate: z.string().regex(DATE_PATTERN),
  note: z.string().trim().min(3, "Tambahkan catatan singkat").max(1000),
  proofPublicId: z.string().min(1).nullable(),
  proofResourceType: proofResourceTypeSchema.nullable(),
}) satisfies z.ZodType<LeaveInput>

export const recordScanSchema = z.object({
  proofPublicId: z.string().min(1, "Ambil selfie terlebih dahulu"),
})

export const appSettingsSchema = z.object({
  timezone: z.string().min(1),
  lateGraceMinutes: z.number().int().min(0).max(240),
  windowBeforeMin: z.number().int().min(0).max(360),
  windowAfterMin: z.number().int().min(1).max(720),
})

export const pushSubscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  userAgent: z.string().max(400).nullable(),
}) satisfies z.ZodType<PushSubscriptionInput>

/** Flattens zod issues into `{ field: [messages] }` for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form"
    result[key] = [...(result[key] ?? []), issue.message]
  }
  return result
}

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")

export const createSwapSchema = z.object({
  partnerId: z.uuid("Pilih rekan kerja"),
  workDate: isoDateSchema,
  note: z.string().trim().max(500).nullable(),
}) satisfies z.ZodType<CreateSwapInput>

export const reviewSwapSchema = z.object({
  swapId: z.uuid(),
  approve: z.boolean(),
  note: z.string().trim().max(500).nullable(),
}) satisfies z.ZodType<ReviewSwapInput>
