"use client"

import { DicesIcon, UserPlusIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createEmployeeAction } from "@/actions/employees"
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { generatePassword } from "@/lib/accounts"

interface FormValues {
  fullName: string
  username: string
  password: string
  email: string
}

const EMPTY: FormValues = { fullName: "", username: "", password: "", email: "" }

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [isPending, startTransition] = useTransition()

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setValues({ ...EMPTY, password: generatePassword() })
      setErrors({})
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await createEmployeeAction({
        fullName: values.fullName,
        username: values.username,
        password: values.password,
        email: values.email.trim() || null,
      })
      if (result.ok) {
        toast.success(result.message)
        setOpen(false)
      } else {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
      }
    })
  }

  const errorsFor = (field: keyof FormValues) => errors[field]?.map((message) => ({ message }))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserPlusIcon data-icon="inline-start" />
        Tambah karyawan
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Tambah karyawan</DialogTitle>
            <DialogDescription>
              Berikan username dan kata sandi awal ke karyawan. Mereka akan diminta menggantinya saat pertama masuk.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errorsFor("fullName") ? true : undefined}>
              <FieldLabel htmlFor="employee-name">Nama lengkap</FieldLabel>
              <Input
                id="employee-name"
                value={values.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                autoComplete="off"
                required
                aria-invalid={errorsFor("fullName") ? true : undefined}
              />
              <FieldError errors={errorsFor("fullName")} />
            </Field>
            <Field data-invalid={errorsFor("username") ? true : undefined}>
              <FieldLabel htmlFor="employee-username">Username</FieldLabel>
              <Input
                id="employee-username"
                value={values.username}
                onChange={(event) => update("username", event.target.value.toLowerCase())}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="contoh: siti.aminah"
                required
                aria-invalid={errorsFor("username") ? true : undefined}
              />
              <FieldDescription>Huruf kecil, angka, titik atau garis bawah (3–30 karakter).</FieldDescription>
              <FieldError errors={errorsFor("username")} />
            </Field>
            <Field data-invalid={errorsFor("password") ? true : undefined}>
              <FieldLabel htmlFor="employee-password">Kata sandi awal</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="employee-password"
                  value={values.password}
                  onChange={(event) => update("password", event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                  required
                  aria-invalid={errorsFor("password") ? true : undefined}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton onClick={() => update("password", generatePassword())} aria-label="Buat kata sandi acak">
                    <DicesIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>Minimal 8 karakter. Catat dan berikan ke karyawan.</FieldDescription>
              <FieldError errors={errorsFor("password")} />
            </Field>
            <Field data-invalid={errorsFor("email") ? true : undefined}>
              <FieldLabel htmlFor="employee-email">Email (opsional)</FieldLabel>
              <Input
                id="employee-email"
                type="email"
                value={values.email}
                onChange={(event) => update("email", event.target.value)}
                autoComplete="off"
                aria-invalid={errorsFor("email") ? true : undefined}
              />
              <FieldDescription>Jika diisi, karyawan juga bisa masuk memakai email.</FieldDescription>
              <FieldError errors={errorsFor("email")} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              Buat akun
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
