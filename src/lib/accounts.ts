// Accounts created without an email get a placeholder auth email (Supabase password auth needs one).
// The `.test` TLD is reserved, so these addresses can never receive mail.
export const PLACEHOLDER_EMAIL_DOMAIN = "karyawan.qbs-presence.test"

export function placeholderEmailFor(username: string): string {
  return `${username}@${PLACEHOLDER_EMAIL_DOMAIN}`
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return Boolean(email?.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`))
}

/** What to show next to a name: "@username · email", skipping placeholder emails. */
export function contactLabel(username: string | null, email: string | null): string {
  const parts = [username ? `@${username}` : null, email && !isPlaceholderEmail(email) ? email : null]
  return parts.filter(Boolean).join(" · ") || "—"
}

const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"

/** Readable random default password (no 0/O/1/l/I), generated with the Web Crypto API. */
export function generatePassword(length = 10): string {
  const bytes = new Uint32Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]).join("")
}
