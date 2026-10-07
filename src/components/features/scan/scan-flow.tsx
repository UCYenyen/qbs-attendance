"use client"

import { CameraIcon, CheckCircle2Icon, RotateCcwIcon } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { recordScanAction } from "@/actions/attendance"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload"
import type { AttendanceSession } from "@/types/attendance"

interface ScanFlowProps {
  session: AttendanceSession
  isLate: boolean
}

export function ScanFlow({ session, isLate }: ScanFlowProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { upload, isUploading, error: uploadError } = useCloudinaryUpload()
  const busy = isPending || isUploading
  const label = session === "check_in" ? "absen masuk" : "absen pulang"

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null
    if (preview) URL.revokeObjectURL(preview)
    setFile(next)
    setPreview(next ? URL.createObjectURL(next) : null)
    setError(null)
  }

  function submit() {
    if (!file) return
    startTransition(async () => {
      const asset = await upload("selfie", file)
      if (!asset) return
      const result = await recordScanAction({ proofPublicId: asset.publicId })
      if (result.ok) setDone(result.message ?? "Berhasil.")
      else setError(result.error)
    })
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2Icon aria-hidden className="size-16 text-primary" />
        <h2 className="text-2xl">{done}</h2>
        <Button nativeButton={false} render={<Link href="/me" />}>
          Lihat status hari ini
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {isLate ? (
        <Alert variant="destructive">
          <AlertTitle>Anda terlambat</AlertTitle>
          <AlertDescription>Absen masuk ini akan ditandai terlambat.</AlertDescription>
        </Alert>
      ) : null}

      <label
        htmlFor="selfie"
        className="flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-secondary/50 text-center"
      >
        {preview ? (
          // Local object URL preview; next/image can't optimise blob: URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Pratinjau selfie" className="size-full object-cover" />
        ) : (
          <>
            <CameraIcon aria-hidden className="size-12 text-primary" />
            <span className="text-lg font-medium">Ketuk untuk ambil selfie</span>
            <span className="px-6 text-sm text-muted-foreground">Pastikan wajah terlihat jelas.</span>
          </>
        )}
      </label>
      <input id="selfie" type="file" accept="image/*" capture="user" className="sr-only" onChange={pick} />

      {error || uploadError ? <p className="text-destructive">{error ?? uploadError}</p> : null}

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={submit} disabled={!file || busy}>
          {busy ? <Spinner data-icon="inline-start" /> : null}
          {isUploading ? "Mengunggah selfie…" : `Kirim ${label}`}
        </Button>
        {file ? (
          <Button size="lg" variant="ghost" nativeButton={false} disabled={busy} render={<label htmlFor="selfie" />}>
            <RotateCcwIcon data-icon="inline-start" />
            Ambil ulang
          </Button>
        ) : null}
      </div>
    </div>
  )
}
