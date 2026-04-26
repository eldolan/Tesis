'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Info, AlertTriangle, AlertCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type NotificationToast = {
  id: string
  severity: 'info' | 'warning' | 'critical'
  tipo: string
  titulo: string
  mensaje: string
  recomendacion?: string | null
}

export default function NotificationsListener() {
  const [toasts, setToasts] = useState<NotificationToast[]>([])

  useEffect(() => {
    const channel = supabase
      .channel('notifications-listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as NotificationToast
          setToasts((prev) => [...prev.slice(-2), n])
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== n.id))
          }, 8000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    supabase.from('notifications').update({ read: true }).eq('id', id).then(() => {})
  }

  const severityStyles: Record<NotificationToast['severity'], string> = {
    info: 'border-blue-400',
    warning: 'border-yellow-400',
    critical: 'border-red-500',
  }

  const severityIconColor: Record<NotificationToast['severity'], string> = {
    info: 'text-blue-400',
    warning: 'text-yellow-400',
    critical: 'text-red-500',
  }

  function SeverityIcon({ severity }: { severity: NotificationToast['severity'] }) {
    const cls = `h-5 w-5 shrink-0 mt-0.5 ${severityIconColor[severity]}`
    if (severity === 'info') return <Info className={cls} />
    if (severity === 'warning') return <AlertTriangle className={cls} />
    return <AlertCircle className={cls} />
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`bg-card border-l-4 rounded-md shadow-lg p-4 flex gap-3 cursor-pointer ${severityStyles[toast.severity]}`}
            onClick={() => dismiss(toast.id)}
          >
            <SeverityIcon severity={toast.severity} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-snug">{toast.titulo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{toast.mensaje}</p>
              {toast.recomendacion && (
                <p className="text-xs text-muted-foreground mt-1 italic">{toast.recomendacion}</p>
              )}
            </div>
            <button
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                dismiss(toast.id)
              }}
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
