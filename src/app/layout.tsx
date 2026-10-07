import type { Metadata, Viewport } from "next"
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google"

import { ThemeProvider } from "@/components/shared/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { publicEnv } from "@/lib/env"

import "./globals.css"

const sans = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"], display: "swap" })
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: "QBS Presence", template: "%s · QBS Presence" },
  description:
    "QBS Presence adalah aplikasi absensi karyawan QBS: scan QR yang berganti tiap menit untuk absen masuk dan pulang, atur jadwal, dan pantau kehadiran.",
  applicationName: "QBS Presence",
  appleWebApp: { capable: true, title: "Presence", statusBarStyle: "default" },
  icons: { icon: "/icons/192", apple: "/icons/192" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "QBS Presence",
    title: "QBS Presence",
    description: "Scan masuk, scan pulang — absensi karyawan QBS.",
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#2a1a21" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" suppressHydrationWarning className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
