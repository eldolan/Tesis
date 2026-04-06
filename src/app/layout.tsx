import type { Metadata } from "next"
import "./globals.css"
import { Navbar } from "@/components/layout/navbar"

export const metadata: Metadata = {
  title: "Panel de Control",
  description: "Panel de control de sensores agrícolas",
  icons: {
    icon: "/images/logo.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark h-full antialiased">
      <body className="min-h-dvh flex flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  )
}
