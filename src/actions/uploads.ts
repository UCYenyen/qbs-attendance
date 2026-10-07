"use server"

import { authorize } from "@/lib/auth"
import { signUpload } from "@/lib/cloudinary"
import type { ActionResult } from "@/types/actions"
import type { SignedUploadParams, UploadKind } from "@/types/cloudinary"

export async function signUploadAction(kind: UploadKind): Promise<ActionResult<SignedUploadParams>> {
  const user = await authorize(["active_employee"])
  if (!user) return { ok: false, error: "Hanya karyawan aktif yang bisa mengunggah bukti." }
  if (kind !== "selfie" && kind !== "document") return { ok: false, error: "Jenis unggahan tidak dikenal." }

  try {
    return { ok: true, data: signUpload(kind, user.id) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unggahan sedang tidak tersedia." }
  }
}
