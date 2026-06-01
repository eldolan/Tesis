"use client"

import Image from "next/image"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"

interface NavLink {
  label: string
  href: string
  active?: boolean
}

export function MobileSidebar({ navLinks }: { navLinks: NavLink[] }) {
  return (
    <Sheet>
      <SheetTrigger className="ml-auto p-2 cursor-pointer" aria-label="Abrir Menú">
        <Image src="/images/menu.svg" alt="Abrir menú" width={32} height={32} className="h-8 w-auto" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(15em,100%)] bg-background border-l border-border p-0">
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <div className="flex flex-col h-full">
          <div className="flex justify-center py-4">
            <Image
              src="/images/logo.svg"
              alt="Logo"
              width={48}
              height={48}
              className="h-12 w-auto"
            />
          </div>
          <nav>
            <ul className="flex flex-col list-none">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className={`block w-full px-8 py-4 text-foreground transition-colors hover:bg-secondary ${
                      link.active ? "text-[#0071FF]" : ""
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto flex items-center justify-center gap-4 py-4 border-t border-border">
            <a href="#">
              <Image src="/images/bell.svg" alt="Notificaciones" width={24} height={24} className="h-6 w-auto" />
            </a>
            <a href="#">
              <Image src="/images/user.svg" alt="Usuario" width={24} height={24} className="h-7 w-auto" />
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
