import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
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
      <body className="min-h-svh font-sans">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
