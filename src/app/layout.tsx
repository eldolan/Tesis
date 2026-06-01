import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"

export const metadata: Metadata = {
  title: "Panel de Control",
  description: "Panel de control de sensores agricolas",
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
    <html lang="es" className="dark antialiased">
      <body className="bg-background">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
