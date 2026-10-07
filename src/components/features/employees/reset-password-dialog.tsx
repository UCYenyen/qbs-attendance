"use client"

import { DicesIcon, KeyRoundIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { resetPasswordAction } from "@/actions/employees"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { generatePassword } from "@/lib/accounts"

interface ResetPasswordDialogProps {
  userId: string
  name: string
}

export function ResetPasswordDialog({ userId, name }: ResetPasswordDialogProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setPassword(generatePassword())
      setError(null)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await resetPasswordAction({ userId, password })
      if (result.ok) {
        toast.success(result.message)
        setOpen(false)
      } else {
        setError(result.fieldErrors?.password?.[0] ?? result.error)
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <KeyRoundIcon data-icon="inline-start" />
        Atur ulang kata sandi
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Atur ulang kata sandi</DialogTitle>
            <DialogDescription>
              Kata sandi baru untuk {name}. Berikan ke karyawan; mereka akan diminta menggantinya saat masuk.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="reset-password">Kata sandi baru</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="reset-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
                required
                aria-invalid={error ? true : undefined}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={() => setPassword(generatePassword())} aria-label="Buat kata sandi acak">
                  <DicesIcon />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>Minimal 8 karakter.</FieldDescription>
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              Simpan kata sandi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
