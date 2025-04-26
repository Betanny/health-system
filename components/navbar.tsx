"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Activity, Home, Users, HeartPulse, Moon, Sun } from "lucide-react"

export default function Navbar() {
  const pathname = usePathname()
  const { setTheme, theme } = useTheme()

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: <Home className="h-4 w-4" />,
    },
    {
      name: "Clients",
      href: "/clients",
      icon: <Users className="h-4 w-4" />,
    },
    {
      name: "Programs",
      href: "/programs",
      icon: <Activity className="h-4 w-4" />,
    },
  ]

  return (
    <nav className="bg-white dark:bg-background border m-4 rounded-2xl border-gray-200 dark:border-white/5 sticky top-3 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
          <HeartPulse className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
          <span className="hidden sm:inline">Health System</span>
          <span className="sm:hidden">Health</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? "secondary" : "ghost"}
                size="sm"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors 
                  ${pathname === item.href 
                    ? 'bg-gray-100 text-black dark:bg-gray-800 dark:text-white' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-black dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'}`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.name}</span>
              </Button>
            </Link>
          ))}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="ml-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-indigo-200 dark:hover:bg-indigo-900 dark:hover:text-gray-50"
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
