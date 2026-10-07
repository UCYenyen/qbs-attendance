"use client"

import { useActionState } from "react"

import { signInAction } from "@/actions/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { ActionResult } from "@/types/actions"

function errorsFor(state: ActionResult | null, field: string) {
  if (!state || state.ok) return undefined
  return state.fieldErrors?.[field]?.map((message) => ({ message }))
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(signInAction, null)
  const emailErrors = errorsFor(state, "email")
  const passwordErrors = errorsFor(state, "password")

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        {state && !state.ok && !state.fieldErrors ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={emailErrors ? true : undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={emailErrors ? true : undefined}
          />
          <FieldError errors={emailErrors} />
        </Field>
        <Field data-invalid={passwordErrors ? true : undefined}>
          <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={passwordErrors ? true : undefined}
          />
          <FieldError errors={passwordErrors} />
        </Field>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          Masuk
        </Button>
      </FieldGroup>
    </form>
  )
}
