"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { cn } from "@/lib/utils"

interface FadeContentProps {
  children: React.ReactNode
  className?: string
  duration?: number
  delay?: number
  blur?: boolean
  initialY?: number
}

export function FadeContent({
  children,
  className,
  duration = 500,
  delay = 0,
  blur = true,
  initialY = 16,
}: FadeContentProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })

  return (
    <motion.div
      ref={ref}
      className={cn("h-full", className)}
      initial={{ opacity: 0, y: initialY, filter: blur ? "blur(8px)" : "none" }}
      animate={
        isInView
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0, y: initialY, filter: blur ? "blur(8px)" : "none" }
      }
      transition={{
        duration: duration / 1000,
        delay: delay / 1000,
        ease: [0.25, 0.4, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
