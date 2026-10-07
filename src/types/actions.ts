/** Uniform return type for server actions consumed by client forms. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export interface QrTokenResult {
  token: string
  url: string
  expiresAt: number
}
