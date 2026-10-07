import "server-only"

import { createClient } from "@/lib/supabase/server"
import { DEFAULT_TIMEZONE } from "@/lib/time"
import type { AppSettings } from "@/types/attendance"

const DEFAULT_SETTINGS: AppSettings = {
  timezone: DEFAULT_TIMEZONE,
  lateGraceMinutes: 15,
  windowBeforeMin: 60,
  windowAfterMin: 120,
}

export async function getAppSettings(): Promise<AppSettings> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("app_settings")
    .select("timezone, late_grace_minutes, window_before_min, window_after_min")
    .maybeSingle()

  if (!data) return DEFAULT_SETTINGS
  return {
    timezone: data.timezone,
    lateGraceMinutes: data.late_grace_minutes,
    windowBeforeMin: data.window_before_min,
    windowAfterMin: data.window_after_min,
  }
}

export async function updateAppSettings(settings: AppSettings): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("app_settings")
    .update({
      timezone: settings.timezone,
      late_grace_minutes: settings.lateGraceMinutes,
      window_before_min: settings.windowBeforeMin,
      window_after_min: settings.windowAfterMin,
    })
    .eq("id", true)
  if (error) throw new Error(error.message)
}
