"use client"

import { CheckIcon, XIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { reviewScheduleAction } from "@/actions/schedule"
import { ScheduleSummary } from "@/components/features/schedule/schedule-summary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import type { ScheduleRequestWithEmployee } from "@/types/schedule"

interface ScheduleRequestCardProps {
  request: ScheduleRequestWithEmployee
  submittedLabel: string
}

export function ScheduleRequestCard({ request, submittedLabel }: ScheduleRequestCardProps) {
  const [note, setNote] = useState("")
  const [isPending, startTransition] = useTransition()

  function review(approve: boolean) {
    startTransition(async () => {
      const result = await reviewScheduleAction({ requestId: request.id, approve, note: note || null })
      if (result.ok) toast.success(result.message)
      else toast.error(result.error)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{request.employee.fullName}</CardTitle>
        <CardDescription>
          {request.employee.email} · diajukan {submittedLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-base">Jadwal yang diajukan</h3>
          <ScheduleSummary schedule={request.items} compareTo={request.currentSchedule} />
          {request.currentSchedule ? (
            <p className="text-sm text-muted-foreground">Baris yang disorot berbeda dari jadwal saat ini.</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-base">Jadwal saat ini</h3>
          {request.currentSchedule ? (
            <ScheduleSummary schedule={request.currentSchedule} />
          ) : (
            <p className="text-muted-foreground">Ini jadwal pertama karyawan.</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3">
        <Field>
          <FieldLabel htmlFor={`note-${request.id}`}>Catatan untuk karyawan (opsional)</FieldLabel>
          <Textarea
            id={`note-${request.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Contoh: jam pulang terlalu malam"
          />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={isPending} onClick={() => review(false)}>
            <XIcon data-icon="inline-start" />
            Tolak
          </Button>
          <Button disabled={isPending} onClick={() => review(true)}>
            <CheckIcon data-icon="inline-start" />
            Setujui
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
