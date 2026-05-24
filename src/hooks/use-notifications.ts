"use client"

import { useState, useEffect } from "react"
import type { Notification } from "@/types"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

export interface UseNotifications {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (id: number) => Promise<void>
}

export function useNotifications(): UseNotifications {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Conteo derivado: solo read === true se considera leída (null y false son no leídas)
  const unreadCount = notifications.filter((n) => n.read !== true).length

  // Fetch inicial de notificaciones
  useEffect(() => {
    const supabase = createClient()

    async function fetchNotifications() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30)

      if (!error && data) {
        setNotifications(data as Notification[])
      }
      setIsLoading(false)
    }

    fetchNotifications()
  }, [])

  // Suscripción realtime a INSERT/UPDATE en la tabla notifications
  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new as Notification, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === (payload.new as Notification).id
                  ? (payload.new as Notification)
                  : n
              )
            )
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  // Marcar como leída con actualización optimista y rollback ante error
  async function markAsRead(id: number): Promise<void> {
    const snapshot = notifications
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )

    const supabase = createClient()
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)

    if (error) {
      setNotifications(snapshot)
      console.error("[use-notifications] Error al marcar como leída:", error)
    }
  }

  return { notifications, unreadCount, isLoading, markAsRead }
}
