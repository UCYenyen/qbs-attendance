import "server-only"

import { v2 as cloudinary } from "cloudinary"

import { publicEnv } from "@/lib/env"
import { serverEnv } from "@/lib/env.server"
import type { ProofResourceType } from "@/types/attendance"
import type { SignedUploadParams, UploadKind } from "@/types/cloudinary"

const ROOT_FOLDER = "qbs-presence"

let configured = false
function client() {
  if (!configured) {
    // CLOUDINARY_URL = cloudinary://<api_key>:<api_secret>@<cloud_name>
    const url = new URL(serverEnv.cloudinaryUrl)
    cloudinary.config({
      cloud_name: url.hostname,
      api_key: decodeURIComponent(url.username),
      api_secret: decodeURIComponent(url.password),
      secure: true,
    })
    configured = true
  }
  return cloudinary
}

export function folderFor(kind: UploadKind, userId: string): string {
  return `${ROOT_FOLDER}/${kind === "selfie" ? "selfies" : "documents"}/${userId}`
}

/** Signs a direct browser upload into the user's own folder as a private (`authenticated`) asset. */
export function signUpload(kind: UploadKind, userId: string): SignedUploadParams {
  const cld = client()
  const { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret } = cld.config()
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary is not configured")

  const timestamp = Math.round(Date.now() / 1000)
  const folder = folderFor(kind, userId)
  const type = "authenticated" as const
  const signature = cld.utils.api_sign_request({ timestamp, folder, type }, apiSecret)
  const resource = kind === "selfie" ? "image" : "auto"

  return {
    cloudName: cloudName || publicEnv.cloudinaryCloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    type,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resource}/upload`,
  }
}

/** True when the asset exists and lives in the user's folder for that kind. */
export async function assetBelongsTo(
  publicId: string,
  kind: UploadKind,
  userId: string,
  resourceType: ProofResourceType = "image",
): Promise<boolean> {
  if (!publicId.startsWith(`${folderFor(kind, userId)}/`)) return false
  try {
    await client().api.resource(publicId, { type: "authenticated", resource_type: resourceType })
    return true
  } catch {
    return false
  }
}

/** Signed delivery URL for a private asset (images are resized for display). */
export function signedAssetUrl(publicId: string, resourceType: ProofResourceType): string {
  return client().url(publicId, {
    type: "authenticated",
    resource_type: resourceType,
    sign_url: true,
    secure: true,
    ...(resourceType === "image"
      ? { transformation: [{ width: 800, crop: "limit", quality: "auto", fetch_format: "auto" }] }
      : {}),
  })
}
