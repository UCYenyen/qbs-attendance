"use client"

import { UserPlusIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { inviteEmployeeAction } from "@/actions/employees"
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export function InviteDialog() {
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await inviteEmployeeAction({
        email: String(form.get("email") ?? ""),
        fullName: String(form.get("fullName") ?? ""),
      })
      if (result.ok) {
        toast.success(result.message)
        setErrors({})
        setOpen(false)
      } else {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
      }
    })
  }

  const nameErrors = errors.fullName?.map((message) => ({ message }))
  const emailErrors = errors.email?.map((message) => ({ message }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlusIcon data-icon="inline-start" />
        Undang karyawan
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Undang karyawan</DialogTitle>
            <DialogDescription>
              Karyawan akan menerima email untuk membuat kata sandi. Akun langsung aktif.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={nameErrors ? true : undefined}>
              <FieldLabel htmlFor="invite-name">Nama lengkap</FieldLabel>
              <Input id="invite-name" name="fullName" autoComplete="off" required aria-invalid={nameErrors ? true : undefined} />
              <FieldError errors={nameErrors} />
            </Field>
            <Field data-invalid={emailErrors ? true : undefined}>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input
                id="invite-email"
                name="email"
                type="email"
                autoComplete="off"
                required
                aria-invalid={emailErrors ? true : undefined}
              />
              <FieldError errors={emailErrors} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              Kirim undangan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
