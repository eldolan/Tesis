"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Loader } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

// Sugerencias fijas de badges para el estado vacío
const SUGERENCIAS = [
  "¿Cuándo debo regar?",
  "¿Cómo está la humedad del suelo?",
  "¿Qué fertilizante necesito?",
  "¿Hay riesgo de estrés hídrico?",
] as const

export function SoilChat() {
  const { user } = useAuth()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => crypto.randomUUID())

  // Saludo personalizado: full_name → prefijo email → genérico
  const nombre =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    null
  const saludo = nombre ? `¡Hola, ${nombre}!` : "¡Hola!"

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput("")

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    }

    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          session_id: sessionId,
        }),
      })

      const data = await res.json()

      if (data.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.response,
          },
        ])
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Error: ${data.error}`,
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Error al conectar con el sistema. Intenta de nuevo.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, sessionId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="space-y-3 p-1">

          {/* Estado vacío: ícono, saludo personalizado y badges de sugerencias */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 pt-4 pb-2">
              <div className="bg-primary/20 rounded-full p-4">
                <Bot size={40} className="text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xl font-semibold text-foreground">{saludo}</p>
                <p className="text-muted-foreground text-sm text-center">
                  Soy tu asistente agrícola. Pregúntame sobre riego, suelo o fertilización.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGERENCIAS.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs"
                    onClick={() => setInput(s)}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Historial de mensajes */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-1.5 last:mb-0">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic">{children}</em>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-4 mb-1.5 space-y-0.5">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-snug">{children}</li>
                      ),
                      code: ({ children }) => (
                        <code className="bg-black/20 rounded px-1 py-0.5 text-xs font-mono">
                          {children}
                        </code>
                      ),
                      h1: ({ children }) => (
                        <p className="font-semibold mb-1">{children}</p>
                      ),
                      h2: ({ children }) => (
                        <p className="font-semibold mb-1">{children}</p>
                      ),
                      h3: ({ children }) => (
                        <p className="font-medium mb-0.5">{children}</p>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="bg-muted rounded-xl px-3 py-2">
                <Loader
                  size={14}
                  className="text-muted-foreground animate-spin"
                />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Área de escritura: Textarea con barra de acciones inferior */}
      <div className="pt-3 border-t border-border mt-2 shrink-0">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregunta sobre el sistema..."
          className="w-full text-sm resize-none max-h-[96px] overflow-auto"
          rows={1}
          disabled={isLoading}
        />
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
