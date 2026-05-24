"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, LogIn, UserPlus, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

type Mode = "login" | "register"

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // Honeypot field - hidden from real users, bots fill it
  const [honeypot, setHoneypot] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    // Anti-spam: if honeypot is filled, silently reject
    if (honeypot) {
      setMessage(mode === "register" ? "Cuenta creada. Revisa tu email." : "Ingresando...")
      return
    }

    if (!email || !password) {
      setError("Completa todos los campos.")
      return
    }

    if (mode === "register" && password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.")
      return
    }

    setLoading(true)

    try {
      // Server-side rate limit check
      const res = await fetch("/api/auth/rate-limit", { method: "POST" })
      if (!res.ok) {
        setError("Demasiados intentos. Espera unos minutos.")
        setLoading(false)
        return
      }

      const supabase = createClient()
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (authError) {
          setError(authError.message === "Invalid login credentials"
            ? "Credenciales incorrectas."
            : authError.message)
        }
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
          },
        })
        if (authError) {
          if (authError.message.includes("already registered")) {
            setError("Este email ya esta registrado.")
          } else {
            setError(authError.message)
          }
        } else {
          setMessage("Cuenta creada exitosamente. Ya puedes iniciar sesion.")
          setMode("login")
        }
      }
    } catch {
      setError("Error de conexion. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-2xl border-border">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <Image src="/images/logo.svg" alt="Logo" width={64} height={64} className="h-16 w-auto" />
          </div>
          <CardTitle className="text-xl">
            {mode === "login" ? "Iniciar Sesion" : "Crear Cuenta"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Tu nombre"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Honeypot - invisible to users */}
            <div className="absolute opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
            )}
            {message && (
              <p className="text-sm text-green-400 bg-green-400/10 rounded-lg px-3 py-2">{message}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : mode === "login" ? (
                <>
                  <LogIn size={18} />
                  Ingresar
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Registrarse
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("register"); setError(null); setMessage(null) }}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Registrate
                  </button>
                </>
              ) : (
                <>
                  Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setError(null); setMessage(null) }}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Inicia sesion
                  </button>
                </>
              )}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
