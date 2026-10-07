import "server-only"

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

import { serverEnv } from "@/lib/env.server"
import { QR_ROTATION_MS } from "@/lib/qr-config"

/** Each QR code is valid for its own window plus the previous one (scan + clock drift grace). */
export const SCAN_PASS_COOKIE = "qbs_scan_pass"
export const SCAN_PASS_TTL_SECONDS = 180

interface QrPayload {
  v: 1
  b: number
  n: string
}

interface ScanPassPayload {
  v: 1
  exp: number
  n: string
}

function sign(data: string): string {
  return createHmac("sha256", serverEnv.qrSigningSecret).update(data).digest("base64url")
}

function encode(payload: QrPayload | ScanPassPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${body}.${sign(body)}`
}

function decode(token: string): unknown {
  const [body, signature] = token.split(".")
  if (!body || !signature) return null

  const expected = Buffer.from(sign(body))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function currentBucket(now: number = Date.now()): number {
  return Math.floor(now / QR_ROTATION_MS)
}

export function createQrToken(now: number = Date.now()): { token: string; expiresAt: number } {
  const bucket = currentBucket(now)
  return {
    token: encode({ v: 1, b: bucket, n: randomBytes(6).toString("base64url") }),
    expiresAt: (bucket + 1) * QR_ROTATION_MS,
  }
}

export function verifyQrToken(token: string, now: number = Date.now()): boolean {
  const payload = decode(token)
  if (!isRecord(payload) || payload.v !== 1 || typeof payload.b !== "number") return false
  const bucket = currentBucket(now)
  return payload.b === bucket || payload.b === bucket - 1
}

export function createScanPass(now: number = Date.now()): string {
  return encode({
    v: 1,
    exp: now + SCAN_PASS_TTL_SECONDS * 1000,
    n: randomBytes(6).toString("base64url"),
  })
}

export function verifyScanPass(pass: string | undefined, now: number = Date.now()): boolean {
  if (!pass) return false
  const payload = decode(pass)
  return isRecord(payload) && payload.v === 1 && typeof payload.exp === "number" && payload.exp > now
}
