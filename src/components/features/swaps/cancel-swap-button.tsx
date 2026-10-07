"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { cancelSwapAction } from "@/actions/swaps"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function CancelSwapButton({ swapId }: { swapId: string }) {
  const [isPending, startTransition] = useTransition()

  function cancel() {
    startTransition(async () => {
      const result = await cancelSwapAction(swapId)
      if (result.ok) toast.success(result.message)
      else toast.error(result.error)
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={cancel} disabled={isPending}>
      {isPending ? <Spinner data-icon="inline-start" /> : null}
      Batalkan
    </Button>
  )
}
