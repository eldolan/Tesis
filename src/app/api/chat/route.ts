export const maxDuration = 60

export async function POST(request: Request) {
  const body = await request.json()

  const n8nUrl = process.env.N8N_WEBHOOK_URL
  const n8nToken = process.env.N8N_AUTH_TOKEN

  if (!n8nUrl || !n8nToken) {
    return Response.json({ error: "N8N no configurado" }, { status: 500 })
  }

  const messages = body.messages ?? []
  if (!messages.length) {
    return Response.json({ error: "Sin mensajes" }, { status: 400 })
  }

  try {
    const res = await fetch(`${n8nUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": n8nToken,
      },
      body: JSON.stringify({
        messages,
        session_id: body.session_id ?? "default",
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error("n8n error:", res.status, errorText)
      return Response.json(
        { error: "Error del agente agrícola" },
        { status: res.status },
      )
    }

    const data = await res.json()
    return Response.json({ response: data.response ?? "Sin respuesta" })
  } catch (err) {
    console.error("Error conectando a n8n:", err)
    return Response.json(
      { error: "No se pudo conectar con el agente" },
      { status: 502 },
    )
  }
}
