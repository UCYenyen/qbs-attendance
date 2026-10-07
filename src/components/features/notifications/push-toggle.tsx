"use client"

import { BellIcon, BellOffIcon, SendIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { sendTestPushAction } from "@/actions/push"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { usePushSubscription } from "@/hooks/use-push-subscription"

export function PushToggle() {
  const { permission, isSubscribed, isBusy, error, subscribe, unsubscribe } = usePushSubscription()
  const [isSending, startTransition] = useTransition()

  if (permission === "unsupported") {
    return (
      <Alert>
        <AlertDescription>
          Browser ini tidak mendukung notifikasi push. Di iPhone/iPad, tambahkan aplikasi ke Layar Utama (iOS 16.4+)
          lalu buka dari ikon tersebut.
        </AlertDescription>
      </Alert>
    )
  }

  function sendTest() {
    startTransition(async () => {
      const result = await sendTestPushAction()
      if (result.ok) toast.success(result.message)
      else toast.error(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {isSubscribed ? (
          <Button variant="outline" onClick={unsubscribe} disabled={isBusy}>
            {isBusy ? <Spinner data-icon="inline-start" /> : <BellOffIcon data-icon="inline-start" />}
            Matikan notifikasi
          </Button>
        ) : (
          <Button onClick={subscribe} disabled={isBusy || permission === "denied"}>
            {isBusy ? <Spinner data-icon="inline-start" /> : <BellIcon data-icon="inline-start" />}
            Aktifkan notifikasi
          </Button>
        )}
        <Button variant="secondary" onClick={sendTest} disabled={!isSubscribed || isSending}>
          {isSending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
          Kirim notifikasi uji
        </Button>
      </div>
      {permission === "denied" ? (
        <p className="text-sm text-destructive">Notifikasi diblokir. Izinkan di pengaturan browser lalu muat ulang.</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
