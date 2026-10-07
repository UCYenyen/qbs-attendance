"use client"

import { ExpandIcon, ShrinkIcon } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useQrRotation } from "@/hooks/use-qr-rotation"
import { QR_ROTATION_SECONDS } from "@/lib/qr-config"

export function KioskQr({ timezone }: { timezone: string }) {
  const { qr, secondsLeft, error } = useQrRotation()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [clock, setClock] = useState("")

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("id-ID", {
      timeZone: timezone,
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    })
    const tick = () => setClock(formatter.format(new Date()))
    tick()
    const interval = setInterval(tick, 1000)
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null)
    document.addEventListener("fullscreenchange", onChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener("fullscreenchange", onChange)
    }
  }, [timezone])

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen()
  }

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl sm:text-4xl">Scan untuk absen</h1>
        <p className="text-lg text-muted-foreground">Buka kamera HP Anda dan arahkan ke kode di bawah.</p>
      </div>

      <div className="rounded-3xl border-4 border-primary/30 bg-white p-5 shadow-sm sm:p-8">
        {qr ? (
          <QRCodeSVG
            value={qr.url}
            size={360}
            level="M"
            marginSize={0}
            className="size-[min(70vw,360px)]"
            title="QR absensi"
          />
        ) : (
          <Skeleton className="size-[min(70vw,360px)]" />
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-lg tabular-nums" aria-live="polite">
          {error ? <span className="text-destructive">{error}</span> : `Kode berganti dalam ${secondsLeft} detik`}
        </p>
        <div className="h-2 w-64 overflow-hidden rounded-full bg-secondary" aria-hidden>
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.min(secondsLeft / QR_ROTATION_SECONDS, 1) * 100}%` }}
          />
        </div>
        <p className="text-muted-foreground tabular-nums">{clock}</p>
      </div>

      <Button variant="outline" onClick={toggleFullscreen}>
        {isFullscreen ? <ShrinkIcon data-icon="inline-start" /> : <ExpandIcon data-icon="inline-start" />}
        {isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
      </Button>
    </div>
  )
}
