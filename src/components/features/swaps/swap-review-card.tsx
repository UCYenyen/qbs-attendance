"use client"

import { ArrowLeftRightIcon, CheckIcon, XIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { reviewSwapAction } from "@/actions/swaps"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { formatShift } from "@/lib/format"
import type { ScheduleSwap } from "@/types/schedule"

interface SwapReviewCardProps {
  swap: ScheduleSwap
  dateLabel: string
  submittedLabel: string
}

export function SwapReviewCard({ swap, dateLabel, submittedLabel }: SwapReviewCardProps) {
  const [note, setNote] = useState("")
  const [isPending, startTransition] = useTransition()

  function review(approve: boolean) {
    startTransition(async () => {
      const result = await reviewSwapAction({ swapId: swap.id, approve, note: note || null })
      if (result.ok) toast.success(result.message)
      else toast.error(result.error)
    })
  }

  const rows = [
    { person: swap.requester, before: swap.requesterShift, after: swap.partnerShift },
    { person: swap.partner, before: swap.partnerShift, after: swap.requesterShift },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {swap.requester.fullName}
          <ArrowLeftRightIcon aria-hidden className="text-primary" />
          {swap.partner.fullName}
        </CardTitle>
        <CardDescription>
          Tukar jadwal {dateLabel} · diajukan {submittedLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ person, before, after }) => (
            <div key={person.id} className="flex flex-col gap-1 rounded-lg border p-3">
              <span className="font-medium">{person.fullName}</span>
              <span className="text-sm text-muted-foreground">{person.contact}</span>
              <span className="tabular-nums">
                {formatShift(before)} → <strong>{formatShift(after)}</strong>
              </span>
            </div>
          ))}
        </div>
        {swap.note ? <p className="text-sm text-muted-foreground">Alasan: {swap.note}</p> : null}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3">
        <Field>
          <FieldLabel htmlFor={`swap-note-${swap.id}`}>Catatan untuk karyawan (opsional)</FieldLabel>
          <Textarea id={`swap-note-${swap.id}`} value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
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
