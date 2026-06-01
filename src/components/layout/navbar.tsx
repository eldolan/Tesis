"use client"

import Image from "next/image"
import { MobileSidebar } from "./mobile-sidebar"

const navLinks = [
  { label: "Inicio", href: "#", active: true },
  { label: "Riego", href: "#" },
  { label: "Fertilizante", href: "#" },
  { label: "Contacto", href: "#" },
]

export function Navbar() {
  return (
    <header>
      {/* Mobile top bar */}
      <div className="flex items-center justify-center border-b border-border md:hidden px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
          Panel de Control
        </h1>
        <MobileSidebar navLinks={navLinks} />
      </div>

      {/* Desktop navbar */}
      <nav className="hidden md:block bg-background border-b border-border">
        <ul className="flex items-center list-none">
          <li className="mr-auto">
            <a href="#" className="flex px-6 py-2">
              <Image
                src="/images/logo.svg"
                alt="Logo"
                width={48}
                height={48}
                className="h-12 w-auto object-cover"
              />
            </a>
          </li>
          {navLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className={`group relative flex items-center px-6 py-4 text-foreground transition-colors hover:text-white ${
                  link.active ? "text-[#0071FF]" : ""
                }`}
              >
                <span className="relative leading-8">
                  {link.label}
                  <span className="absolute bottom-1 left-1/2 h-0.5 w-0 rounded bg-white transition-all duration-300 group-hover:left-0 group-hover:w-full" />
                </span>
              </a>
            </li>
          ))}
          <li className="ml-auto">
            <a href="#" className="flex px-4 py-4">
              <Image
                src="/images/bell.svg"
                alt="Notificaciones"
                width={24}
                height={24}
                className="h-[1.9rem] w-auto"
              />
            </a>
          </li>
          <li>
            <a href="#" className="flex px-4 py-4">
              <Image
                src="/images/user.svg"
                alt="Usuario"
                width={24}
                height={24}
                className="h-8 w-auto"
              />
            </a>
          </li>
        </ul>
      </nav>
    </header>
  )
}
