import type { ProofResourceType } from "@/types/attendance"

export type UploadKind = "selfie" | "document"

/** Parameters the browser needs to upload directly to Cloudinary. */
export interface SignedUploadParams {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
  type: "authenticated"
  uploadUrl: string
}

export interface UploadedAsset {
  publicId: string
  resourceType: ProofResourceType
}

/** Subset of Cloudinary's upload API response that we read. */
export interface CloudinaryUploadResponse {
  public_id: string
  resource_type: string
  secure_url: string
}
