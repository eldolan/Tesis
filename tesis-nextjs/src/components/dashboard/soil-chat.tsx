"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useRef, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, Loader } from "lucide-react"

export function SoilChat() {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  const isLoading = status === "submitted" || status === "streaming"

  // Auto-scroll al fondo cuando llegan mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Área de mensajes con scroll propio */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="space-y-3 p-1">

          {/* Mensaje de bienvenida fijo */}
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Bot size={14} className="text-primary" />
            </div>
            <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-muted text-foreground">
              Hola! Soy tu asistente agrícola. Tengo acceso en tiempo real a los datos de todos los sensores. Pregúntame sobre el estado del suelo, riego, fertilizantes o cualquier cosa del cultivo.
            </div>
          </div>

          {messages.map((msg) => {
            const textPart = msg.parts?.find((p) => p.type === "text")
            const text = textPart && "text" in textPart ? textPart.text : ""
            if (!text) return null

            return (
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
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="leading-snug">{children}</li>,
                        code: ({ children }) => (
                          <code className="bg-black/20 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                        ),
                        h1: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                        h2: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                        h3: ({ children }) => <p className="font-medium mb-0.5">{children}</p>,
                      }}
                    >
                      {text}
                    </ReactMarkdown>
                  ) : (
                    text
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User size={14} className="text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          })}

          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="bg-muted rounded-xl px-3 py-2">
                <Loader size={14} className="text-muted-foreground animate-spin" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input fijo al fondo */}
      <div className="flex gap-2 pt-3 border-t border-border mt-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregunta sobre el sistema..."
          className="flex-1 text-sm"
          disabled={isLoading}
        />
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
  )
}
