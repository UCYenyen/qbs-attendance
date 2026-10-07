"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { updateRoleAction } from "@/actions/employees"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ROLE_LABELS } from "@/lib/format"
import { userRoleSchema } from "@/lib/validation"
import type { UserRole } from "@/types/user"

const ROLE_ITEMS = (Object.keys(ROLE_LABELS) as UserRole[]).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}))

export function RoleSelect({ userId, role }: { userId: string; role: UserRole }) {
  const [isPending, startTransition] = useTransition()

  function change(value: unknown) {
    const parsed = userRoleSchema.safeParse(value)
    if (!parsed.success || parsed.data === role) return
    startTransition(async () => {
      const result = await updateRoleAction({ userId, role: parsed.data })
      if (result.ok) toast.success(result.message)
      else toast.error(result.error)
    })
  }

  return (
    <Select items={ROLE_ITEMS} value={role} onValueChange={change} disabled={isPending}>
      <SelectTrigger size="sm" className="w-44" aria-label="Peran">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {ROLE_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
