"use client"

import { Bell, Check, CheckCheck } from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export function NotificationsPopover() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications()

  return (
    <Popover>
      <div className="relative inline-flex">
        <PopoverTrigger
          aria-label={
            unreadCount > 0
              ? `Notificaciones, ${unreadCount} sin leer`
              : "Notificaciones"
          }
          className="inline-flex h-8 w-8 items-center justify-center rounded-md p-0 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell size={15} />
        </PopoverTrigger>
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none flex items-center justify-center pointer-events-none"
          >
            {unreadCount > 9 ? "9+" : String(unreadCount)}
          </Badge>
        )}
      </div>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
          <p className="font-semibold text-sm">Notificaciones</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck size={12} className="mr-1" />
              Marcar todas como leídas
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-3 space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Sin notificaciones</p>
          </div>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-3 py-2.5 flex flex-col gap-1 ${
                    notification.read === true ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-tight">
                      {notification.title}
                    </p>
                    {notification.read !== true && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check size={12} className="mr-1" />
                        Leída
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
