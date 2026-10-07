import "server-only"

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export const serverEnv = {
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY")
  },
  get qrSigningSecret() {
    return required("QR_SIGNING_SECRET")
  },
  get cloudinaryUrl() {
    return required("CLOUDINARY_URL")
  },
  get vapidPrivateKey() {
    return required("VAPID_PRIVATE_KEY")
  },
  get vapidSubject() {
    return process.env.VAPID_SUBJECT ?? "mailto:admin@example.com"
  },
}
