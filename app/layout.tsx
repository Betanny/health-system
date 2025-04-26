import type React from "react"
import type { Metadata } from "next"
import { Urbanist } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from "@/components/navbar"

const urbanist = Urbanist({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-urbanist'
})

export const metadata: Metadata = {
  title: "Health Information System",
  description: "Manage clients and health programs efficiently"}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true} className="h-full">
      {/* Apply flex column and min-height to body to enable sticky footer */}
      <body className={`${urbanist.className} antialiased bg-gray-50 dark:bg-black md:mx-12 flex flex-col min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} disableTransitionOnChange>
          <Navbar />
          {/* Apply flex-grow to main content area so it pushes the footer down */}
          <main className="flex-grow">
            <section className="py-10 md:py-24 lg:py-28 mx-4 my-0 border border-gray-200 dark:border-white/5 rounded-2xl xl:py-12 bg-white dark:bg-background relative overflow-hidden">
              {/* Background hero image with overlay */}
              <div className="absolute inset-0 bg-cover bg-center z-0"
                   style={{
                     backgroundImage: "url('./hero.webp')",
                     opacity: 0.15
                   }}>
              </div>
              <div className="container px-4 md:px-6 relative z-10">
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tighter text-gray-900 dark:text-gray-100 sm:text-4xl md:text-5xl lg:text-6xl/none">
                      Health Information System
                    </h1>
                    <p className="mx-auto max-w-[700px] text-gray-600 dark:text-indigo-200/80 md:text-xl">
                      Manage clients and health programs efficiently in one place.
                    </p>
                  </div>
                </div>
              </div>
            </section>
            {/* Page specific content */}
            {children}
          </main>
          <footer className="flex h-16 items-center md:-mx-12 overflow-hidden justify-center border-t border-gray-200 bg-gradient-to-t from-gray-100 to-transparent dark:border-white/10 dark:from-black mt-auto"> {/* mt-auto ensures it sticks to bottom in flex container */}
            <p className="text-sm text-gray-500 dark:text-gray-400">© 2025 Health System Inc.</p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
