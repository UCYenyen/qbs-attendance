import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QBS Presence",
    short_name: "Presence",
    description: "Scan masuk, scan pulang — absensi karyawan QBS.",
    lang: "id",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf7f9",
    theme_color: "#e05a8f",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
