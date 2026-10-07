"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { RANGE_KEYS, RANGE_LABELS, parseRangeKey } from "@/lib/date-range"

/** Daily / weekly / monthly / yearly switch, stored in the `range` search param. */
export function RangeToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const current = parseRangeKey(searchParams.get("range") ?? undefined)

  function select(value: string[]) {
    const next = parseRangeKey(value[0])
    if (!value[0] || next === current) return
    const params = new URLSearchParams(searchParams)
    params.set("range", next)
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }))
  }

  return (
    <div className="flex items-center gap-2">
      <ToggleGroup variant="outline" value={[current]} onValueChange={select} aria-label="Rentang waktu">
        {RANGE_KEYS.map((key) => (
          <ToggleGroupItem key={key} value={key}>
            {RANGE_LABELS[key]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {isPending ? <Spinner className="text-muted-foreground" /> : null}
    </div>
  )
}
