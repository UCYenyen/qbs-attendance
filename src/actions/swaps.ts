"use server"

import { refresh } from "next/cache"

import { authorize } from "@/lib/auth"
import { getAppSettings } from "@/lib/db/settings"
import { cancelSwap, createSwap, previewSwap, reviewSwap } from "@/lib/db/swaps"
import { localNow, shiftDate } from "@/lib/time"
import { createSwapSchema, fieldErrors, reviewSwapSchema } from "@/lib/validation"
import type { ActionResult } from "@/types/actions"
import type { CreateSwapInput, ReviewSwapInput, SwapPreview } from "@/types/schedule"

const MAX_DAYS_AHEAD = 60

async function validDate(workDate: string): Promise<string | null> {
  const settings = await getAppSettings()
  const today = localNow(settings.timezone).date
  if (workDate < today) return "Tanggal sudah lewat."
  if (workDate > shiftDate(today, MAX_DAYS_AHEAD)) return `Pilih tanggal dalam ${MAX_DAYS_AHEAD} hari ke depan.`
  return null
}

export async function previewSwapAction(partnerId: string, workDate: string): Promise<ActionResult<SwapPreview>> {
  const user = await authorize(["active_employee"])
  if (!user) return { ok: false, error: "Hanya karyawan aktif yang bisa tukar jadwal." }

  const parsed = createSwapSchema.safeParse({ partnerId, workDate, note: null })
  if (!parsed.success) return { ok: false, error: "Pilih rekan dan tanggal." }
  const dateError = await validDate(parsed.data.workDate)
  if (dateError) return { ok: false, error: dateError }

  try {
    return { ok: true, data: await previewSwap(user.id, parsed.data.partnerId, parsed.data.workDate) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal memuat jadwal." }
  }
}

/** Creates a pending swap; nothing changes until an admin approves it. Admins get a push. */
export async function createSwapAction(input: CreateSwapInput): Promise<ActionResult> {
  const user = await authorize(["active_employee"])
  if (!user) return { ok: false, error: "Hanya karyawan aktif yang bisa tukar jadwal." }

  const parsed = createSwapSchema.safeParse({ ...input, note: input.note?.trim() || null })
  if (!parsed.success) {
    return { ok: false, error: "Periksa kolom yang ditandai.", fieldErrors: fieldErrors(parsed.error) }
  }
  if (parsed.data.partnerId === user.id) return { ok: false, error: "Tidak bisa tukar jadwal dengan diri sendiri." }
  const dateError = await validDate(parsed.data.workDate)
  if (dateError) return { ok: false, error: dateError, fieldErrors: { workDate: [dateError] } }

  try {
    await createSwap(parsed.data)
  } catch (error) {
    // The DB trigger raises user-facing (Indonesian) messages for rule violations.
    return { ok: false, error: error instanceof Error ? error.message : "Gagal mengajukan tukar jadwal." }
  }
  refresh()
  return { ok: true, data: undefined, message: "Pengajuan tukar jadwal dikirim ke admin." }
}

export async function cancelSwapAction(swapId: string): Promise<ActionResult> {
  if (!(await authorize(["active_employee"]))) return { ok: false, error: "Tidak diizinkan." }
  try {
    const cancelled = await cancelSwap(swapId)
    if (!cancelled) return { ok: false, error: "Pengajuan sudah direview atau tidak ditemukan." }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal membatalkan." }
  }
  refresh()
  return { ok: true, data: undefined, message: "Pengajuan dibatalkan." }
}

export async function reviewSwapAction(input: ReviewSwapInput): Promise<ActionResult> {
  if (!(await authorize(["admin"]))) return { ok: false, error: "Hanya admin yang bisa mereview tukar jadwal." }

  const parsed = reviewSwapSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Review tidak valid." }

  try {
    await reviewSwap(parsed.data)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal mereview tukar jadwal." }
  }
  refresh()
  return {
    ok: true,
    data: undefined,
    message: parsed.data.approve ? "Tukar jadwal disetujui." : "Tukar jadwal ditolak.",
  }
}
