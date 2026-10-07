"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { updateSettingsAction } from "@/actions/settings"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { AppSettings } from "@/types/attendance"

type NumericKey = Exclude<keyof AppSettings, "timezone">

const NUMERIC_FIELDS: { key: NumericKey; label: string; description: string }[] = [
  { key: "windowBeforeMin", label: "Dibuka sebelum jadwal (menit)", description: "Absen bisa dilakukan sejak X menit sebelum jam jadwal." },
  { key: "windowAfterMin", label: "Ditutup setelah jadwal (menit)", description: "Setelah ini, sesi tanpa absen dicatat sebagai alpa." },
  { key: "lateGraceMinutes", label: "Toleransi terlambat (menit)", description: "Absen masuk lewat batas ini ditandai terlambat." },
]

export function SettingsForm({ initial }: { initial: AppSettings }) {
  const [values, setValues] = useState<AppSettings>(initial)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await updateSettingsAction(values)
      if (result.ok) {
        setErrors({})
        toast.success(result.message)
      } else {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
      }
    })
  }

  const timezoneErrors = errors.timezone?.map((message) => ({ message }))

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={timezoneErrors ? true : undefined}>
          <FieldLabel htmlFor="timezone">Zona waktu</FieldLabel>
          <Input
            id="timezone"
            value={values.timezone}
            onChange={(event) => setValues({ ...values, timezone: event.target.value })}
            aria-invalid={timezoneErrors ? true : undefined}
          />
          <FieldDescription>
            Contoh: Asia/Jakarta (WIB). Jadwal cron ringkasan memakai UTC — ubah juga jika zona waktu diganti.
          </FieldDescription>
          <FieldError errors={timezoneErrors} />
        </Field>
        {NUMERIC_FIELDS.map((field) => {
          const fieldErrors = errors[field.key]?.map((message) => ({ message }))
          return (
            <Field key={field.key} data-invalid={fieldErrors ? true : undefined}>
              <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
              <Input
                id={field.key}
                type="number"
                inputMode="numeric"
                min={0}
                value={values[field.key]}
                onChange={(event) => setValues({ ...values, [field.key]: Number(event.target.value) })}
                aria-invalid={fieldErrors ? true : undefined}
              />
              <FieldDescription>{field.description}</FieldDescription>
              <FieldError errors={fieldErrors} />
            </Field>
          )
        })}
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Simpan pengaturan
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
