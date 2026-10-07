"use client"

import { useState } from "react"

import { signUploadAction } from "@/actions/uploads"
import type { ProofResourceType } from "@/types/attendance"
import type { CloudinaryUploadResponse, UploadKind, UploadedAsset } from "@/types/cloudinary"

export interface CloudinaryUploadState {
  upload: (kind: UploadKind, file: File) => Promise<UploadedAsset | null>
  isUploading: boolean
  error: string | null
}

function isUploadResponse(value: unknown): value is CloudinaryUploadResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "public_id" in value &&
    typeof value.public_id === "string" &&
    "resource_type" in value &&
    typeof value.resource_type === "string"
  )
}

function toResourceType(value: string): ProofResourceType {
  return value === "raw" || value === "video" ? value : "image"
}

/** Signed direct upload from the browser to Cloudinary (file never passes through our server). */
export function useCloudinaryUpload(): CloudinaryUploadState {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(kind: UploadKind, file: File): Promise<UploadedAsset | null> {
    setIsUploading(true)
    setError(null)
    try {
      const signed = await signUploadAction(kind)
      if (!signed.ok) {
        setError(signed.error)
        return null
      }

      const body = new FormData()
      body.append("file", file)
      body.append("api_key", signed.data.apiKey)
      body.append("timestamp", String(signed.data.timestamp))
      body.append("signature", signed.data.signature)
      body.append("folder", signed.data.folder)
      body.append("type", signed.data.type)

      const response = await fetch(signed.data.uploadUrl, { method: "POST", body })
      const json: unknown = await response.json()
      if (!response.ok || !isUploadResponse(json)) {
        setError("Unggahan gagal. Periksa koneksi lalu coba lagi.")
        return null
      }
      return { publicId: json.public_id, resourceType: toResourceType(json.resource_type) }
    } catch {
      setError("Unggahan gagal. Periksa koneksi lalu coba lagi.")
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return { upload, isUploading, error }
}
