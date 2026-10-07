"use client"

import { ArrowRightIcon } from "lucide-react"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { createSwapAction, previewSwapAction } from "@/actions/swaps"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { formatShift } from "@/lib/format"
import type { SwapPartner, SwapPreview } from "@/types/schedule"

interface SwapRequestFormProps {
  partners: SwapPartner[]
  minDate: string
  maxDate: string
}

export function SwapRequestForm({ partners, minDate, maxDate }: SwapRequestFormProps) {
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [workDate, setWorkDate] = useState("")
  const [note, setNote] = useState("")
  const [preview, setPreview] = useState<SwapPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoadingPreview, startPreview] = useTransition()
  const [isPending, startTransition] = useTransition()

  const items = partners.map((p) => ({ value: p.id, label: p.username ? `${p.fullName} (@${p.username})` : p.fullName }))
  const partnerName = partners.find((p) => p.id === partnerId)?.fullName ?? "rekan"

  useEffect(() => {
    if (!partnerId || !workDate) return
    let cancelled = false
    startPreview(async () => {
      const result = await previewSwapAction(partnerId, workDate)
      if (cancelled) return
      setPreview(result.ok ? result.data : null)
      setPreviewError(result.ok ? null : result.error)
    })
    return () => {
      cancelled = true
    }
  }, [partnerId, workDate])

  const sameShift =
    preview !== null && formatShift(preview.mine) === formatShift(preview.partner)
  const bothOff = preview !== null && !preview.mine.isWorkingDay && !preview.partner.isWorkingDay
  const canSubmit = Boolean(partnerId && workDate && preview && !sameShift && !bothOff && !isPending)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!partnerId) return
    startTransition(async () => {
      const result = await createSwapAction({ partnerId, workDate, note: note || null })
      if (result.ok) {
        toast.success(result.message)
        setNote("")
        setWorkDate("")
        setPreview(null)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (partners.length === 0) {
    return <p className="text-muted-foreground">Belum ada karyawan aktif lain untuk diajak tukar jadwal.</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="swap-partner">Tukar dengan</FieldLabel>
          <Select items={items} value={partnerId} onValueChange={(value) => setPartnerId(typeof value === "string" ? value : null)}>
            <SelectTrigger id="swap-partner" className="w-full">
              <SelectValue placeholder="Pilih rekan kerja" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="swap-date">Tanggal</FieldLabel>
          <Input
            id="swap-date"
            type="date"
            value={workDate}
            min={minDate}
            max={maxDate}
            onChange={(event) => setWorkDate(event.target.value)}
            required
          />
          <FieldDescription>Hanya tanggal ini yang ditukar. Jadwal mingguan tetap sama.</FieldDescription>
        </Field>

        {partnerId && workDate ? (
          isLoadingPreview ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : previewError ? (
            <FieldError>{previewError}</FieldError>
          ) : preview ? (
            <div className="grid gap-3 rounded-xl border bg-secondary/40 p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Jadwal Anda</span>
                <span className="flex items-center gap-2 font-medium tabular-nums">
                  {formatShift(preview.mine)}
                  <ArrowRightIcon aria-hidden className="size-4 text-primary" />
                  {formatShift(preview.partner)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Jadwal {partnerName}</span>
                <span className="flex items-center gap-2 font-medium tabular-nums">
                  {formatShift(preview.partner)}
                  <ArrowRightIcon aria-hidden className="size-4 text-primary" />
                  {formatShift(preview.mine)}
                </span>
              </div>
              {sameShift || bothOff ? (
                <Alert variant="destructive" className="sm:col-span-2">
                  <AlertDescription>
                    {bothOff ? "Kalian berdua libur di tanggal itu." : "Jadwal kalian di tanggal itu sama."}
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : null
        ) : null}

        <Field>
          <FieldLabel htmlFor="swap-note">Alasan (opsional)</FieldLabel>
          <Textarea
            id="swap-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Contoh: ada keperluan keluarga pagi hari"
          />
        </Field>

        <Button type="submit" size="lg" disabled={!canSubmit}>
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          Ajukan ke admin
        </Button>
      </FieldGroup>
    </form>
  )
}
