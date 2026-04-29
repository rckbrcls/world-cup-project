import type { Metadata } from "next"
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"

import "./globals.css"
import { QueryProvider } from "@/components/query-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
})

const displayFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
})

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  icons: {
    icon: "/trophy.png",
    shortcut: "/trophy.png",
    apple: "/trophy.png",
  },
  other: {
    google: "notranslate",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "bg-background antialiased",
        bodyFont.variable,
        displayFont.variable,
        fontMono.variable
      )}
    >
      <body translate="no" className="min-h-svh font-sans">
        <ThemeProvider>
          <QueryProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
