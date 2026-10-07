import { ImageResponse } from "next/og"

const SIZES = [96, 192, 512] as const

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }))
}

/** App icon (PWA manifest, push notifications): a pink rounded square with a check mark. */
export async function GET(_request: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size: raw } = await ctx.params
  const size = SIZES.find((s) => String(s) === raw) ?? 192

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e05a8f",
          borderRadius: size * 0.22,
        }}
      >
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="#fff5f8"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: size, height: size },
  )
}
