"use client"

import { PaperclipIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { submitLeaveAction } from "@/actions/attendance"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload"
import type { LeaveStatus } from "@/types/attendance"

interface LeaveFormProps {
  today: string
  minDate: string
  maxDate: string
}

export function LeaveForm({ today, minDate, maxDate }: LeaveFormProps) {
  const [status, setStatus] = useState<LeaveStatus>("sick")
  const [workDate, setWorkDate] = useState(today)
  const [note, setNote] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [isPending, startTransition] = useTransition()
  const { upload, isUploading, error: uploadError } = useCloudinaryUpload()
  const busy = isPending || isUploading

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const asset = file ? await upload("document", file) : null
      if (file && !asset) return

      const result = await submitLeaveAction({
        status,
        workDate,
        note,
        proofPublicId: asset?.publicId ?? null,
        proofResourceType: asset?.resourceType ?? null,
      })
      if (result.ok) {
        toast.success(result.message)
        setNote("")
        setFile(null)
        setErrors({})
      } else {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
      }
    })
  }

  const noteError = errors.note?.map((message) => ({ message }))

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel>Jenis</FieldLabel>
          <ToggleGroup
            variant="outline"
            value={[status]}
            onValueChange={(value: string[]) => {
              const next = value[0]
              if (next === "sick" || next === "excused") setStatus(next)
            }}
          >
            <ToggleGroupItem value="sick">Sakit</ToggleGroupItem>
            <ToggleGroupItem value="excused">Izin</ToggleGroupItem>
          </ToggleGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor="leave-date">Tanggal</FieldLabel>
          <Input
            id="leave-date"
            type="date"
            value={workDate}
            min={minDate}
            max={maxDate}
            onChange={(event) => setWorkDate(event.target.value)}
            required
          />
        </Field>

        <Field data-invalid={noteError ? true : undefined}>
          <FieldLabel htmlFor="leave-note">Catatan</FieldLabel>
          <Textarea
            id="leave-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={status === "sick" ? "Contoh: demam, istirahat di rumah" : "Contoh: acara keluarga"}
            rows={4}
            aria-invalid={noteError ? true : undefined}
            required
          />
          <FieldError errors={noteError} />
        </Field>

        <Field>
          <FieldLabel htmlFor="leave-proof">Dokumen pendukung (opsional)</FieldLabel>
          <Input
            id="leave-proof"
            type="file"
            accept="image/*,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <FieldDescription>
            <PaperclipIcon aria-hidden className="inline size-4" /> Surat dokter atau foto pendukung (gambar/PDF).
          </FieldDescription>
          {uploadError ? <FieldError>{uploadError}</FieldError> : null}
        </Field>

        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Spinner data-icon="inline-start" /> : null}
          {isUploading ? "Mengunggah…" : "Kirim"}
        </Button>
      </FieldGroup>
    </form>
  )
}
