import { runAgent } from '@/lib/agent/graph'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const { messages } = await req.json()
  return runAgent(messages)
}
