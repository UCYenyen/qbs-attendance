"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { changePasswordAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { ChangePasswordInput } from "@/types/user"

const EMPTY: ChangePasswordInput = { currentPassword: "", password: "", confirm: "" }

export function ChangePasswordForm({ homePath }: { homePath: string }) {
  const router = useRouter()
  const [values, setValues] = useState<ChangePasswordInput>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [isPending, startTransition] = useTransition()

  function update(field: keyof ChangePasswordInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await changePasswordAction(values)
      if (result.ok) {
        toast.success(result.message)
        setValues(EMPTY)
        setErrors({})
        router.replace(homePath)
        router.refresh()
      } else {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
      }
    })
  }

  const errorsFor = (field: keyof ChangePasswordInput) => errors[field]?.map((message) => ({ message }))

  const fields: { key: keyof ChangePasswordInput; label: string; autoComplete: string; hint?: string }[] = [
    { key: "currentPassword", label: "Kata sandi saat ini", autoComplete: "current-password" },
    { key: "password", label: "Kata sandi baru", autoComplete: "new-password", hint: "Minimal 8 karakter." },
    { key: "confirm", label: "Ulangi kata sandi baru", autoComplete: "new-password" },
  ]

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        {fields.map((field) => (
          <Field key={field.key} data-invalid={errorsFor(field.key) ? true : undefined}>
            <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
            <Input
              id={field.key}
              type="password"
              value={values[field.key]}
              onChange={(event) => update(field.key, event.target.value)}
              autoComplete={field.autoComplete}
              required
              aria-invalid={errorsFor(field.key) ? true : undefined}
            />
            {field.hint ? <FieldDescription>{field.hint}</FieldDescription> : null}
            <FieldError errors={errorsFor(field.key)} />
          </Field>
        ))}
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Ganti kata sandi
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
