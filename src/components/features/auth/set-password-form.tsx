"use client"

import { useActionState } from "react"

import { setPasswordAction } from "@/actions/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { ActionResult } from "@/types/actions"

export function SetPasswordForm() {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    setPasswordAction,
    null,
  )
  const errors = state && !state.ok ? state.fieldErrors : undefined
  const passwordErrors = errors?.password?.map((message) => ({ message }))
  const confirmErrors = errors?.confirm?.map((message) => ({ message }))

  return (
    <form action={formAction}>
      <FieldGroup>
        {state && !state.ok && !errors ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={passwordErrors ? true : undefined}>
          <FieldLabel htmlFor="password">Kata sandi baru</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            aria-invalid={passwordErrors ? true : undefined}
          />
          <FieldDescription>Minimal 8 karakter.</FieldDescription>
          <FieldError errors={passwordErrors} />
        </Field>
        <Field data-invalid={confirmErrors ? true : undefined}>
          <FieldLabel htmlFor="confirm">Ulangi kata sandi</FieldLabel>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={confirmErrors ? true : undefined}
          />
          <FieldError errors={confirmErrors} />
        </Field>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          Simpan kata sandi
        </Button>
      </FieldGroup>
    </form>
  )
}
