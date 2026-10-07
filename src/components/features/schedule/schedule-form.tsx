"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { LockIcon } from "lucide-react"
import { useTransition } from "react"
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { submitScheduleAction } from "@/actions/schedule"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/format"
import { weeklyScheduleSchema } from "@/lib/validation"
import type { WeeklySchedule } from "@/types/schedule"

const formSchema = z.object({ days: weeklyScheduleSchema })
type ScheduleFormValues = z.infer<typeof formSchema>

interface ScheduleFormProps {
  initial: WeeklySchedule
  isLocked: boolean
  rejectionNote: string | null
}

export function ScheduleForm({ initial, isLocked, rejectionNote }: ScheduleFormProps) {
  const [isPending, startTransition] = useTransition()
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { days: initial },
  })
  const days = useWatch({ control: form.control, name: "days" })
  const rootError = form.formState.errors.days?.root?.message ?? form.formState.errors.days?.message

  function firstMessage(errors: FieldErrors<ScheduleFormValues>): string {
    const days = errors.days
    if (!days) return "Periksa kembali jadwal Anda."
    if (days.message) return days.message
    if (days.root?.message) return days.root.message
    for (const day of Array.isArray(days) ? days : []) {
      const message = day?.endTime?.message ?? day?.startTime?.message ?? day?.isWorkingDay?.message
      if (message) return message
    }
    return "Periksa kembali jadwal Anda."
  }

  function onInvalid(errors: FieldErrors<ScheduleFormValues>) {
    toast.error(firstMessage(errors))
  }

  function onSubmit(values: ScheduleFormValues) {
    startTransition(async () => {
      const result = await submitScheduleAction(values.days)
      if (result.ok) toast.success(result.message)
      else toast.error(result.error)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-6">
      {isLocked ? (
        <Alert>
          <LockIcon />
          <AlertTitle>Menunggu review admin</AlertTitle>
          <AlertDescription>
            Jadwal bisa diubah lagi setelah admin menyetujui atau menolak pengajuan ini.
          </AlertDescription>
        </Alert>
      ) : rejectionNote ? (
        <Alert variant="destructive">
          <AlertTitle>Pengajuan jadwal terakhir ditolak</AlertTitle>
          <AlertDescription>{rejectionNote}</AlertDescription>
        </Alert>
      ) : null}

      <FieldSet disabled={isLocked || isPending}>
        <FieldLegend className="sr-only">Jadwal mingguan</FieldLegend>
        <FieldGroup className="gap-3">
          {WEEKDAY_ORDER.map((weekday) => {
            const index = days.findIndex((day) => day.weekday === weekday)
            if (index < 0) return null
            const day = days[index]
            const endError = form.formState.errors.days?.[index]?.endTime?.message

            return (
              <div
                key={weekday}
                className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[10rem_1fr_1fr] sm:items-center"
              >
                <Controller
                  control={form.control}
                  name={`days.${index}.isWorkingDay`}
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <Switch
                        id={`day-${weekday}-working`}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <FieldLabel htmlFor={`day-${weekday}-working`} className="font-medium">
                        {WEEKDAY_LABELS[weekday]}
                      </FieldLabel>
                    </Field>
                  )}
                />
                {day.isWorkingDay ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor={`day-${weekday}-start`}>Mulai (absen masuk)</FieldLabel>
                      <Input id={`day-${weekday}-start`} type="time" {...form.register(`days.${index}.startTime`)} />
                    </Field>
                    <Field data-invalid={endError ? true : undefined}>
                      <FieldLabel htmlFor={`day-${weekday}-end`}>Selesai (absen pulang)</FieldLabel>
                      <Input
                        id={`day-${weekday}-end`}
                        type="time"
                        aria-invalid={endError ? true : undefined}
                        {...form.register(`days.${index}.endTime`)}
                      />
                      <FieldError>{endError}</FieldError>
                    </Field>
                  </>
                ) : (
                  <p className="text-muted-foreground sm:col-span-2">Libur</p>
                )}
              </div>
            )
          })}
        </FieldGroup>
      </FieldSet>

      {rootError ? <p className="text-sm text-destructive">{rootError}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isLocked || isPending}>
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          Simpan jadwal
        </Button>
      </div>
    </form>
  )
}
