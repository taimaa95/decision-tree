// pages/api/admin/tree.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { parse } from 'cookie'
import { supabaseServer } from '../../../lib/supabaseServer'

type NodeRow = {
  id: string
  user_input_message_id: number
  bot_response_message_id: number
  user_options: Array<{ node_id: string; label: string }>
}
type MessageRow = { id: number; content: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  // — 1) Authenticate via the session cookie —
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {}
  const clientId = cookies.session
  if (!clientId) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  // — 2) Load this client’s nodes —
  const { data: nodes, error: nodesErr } = await supabaseServer
    .from<NodeRow>('nodes')
    .select('id, user_input_message_id, bot_response_message_id, user_options')
    .eq('client_id', clientId)

  if (nodesErr || !nodes) {
    return res.status(500).json({ error: nodesErr?.message })
  }

  // — 3) Batch-load all referenced messages —
  const messageIds = Array.from(
    new Set(nodes.flatMap(n => [n.user_input_message_id, n.bot_response_message_id]))
  )
  const { data: messages, error: msgErr } = await supabaseServer
    .from<MessageRow>('messages')
    .select('id, content')
    .in('id', messageIds)

  if (msgErr || !messages) {
    return res.status(500).json({ error: msgErr?.message })
  }

  // — 4) Merge into the “tree” shape —
  const tree = nodes.map(n => ({
    id: n.id,
    userInput: messages.find(m => m.id === n.user_input_message_id)?.content || '',
    botResponse: messages.find(m => m.id === n.bot_response_message_id)?.content || '',
    userOptions: n.user_options,
  }))

  return res.status(200).json({ tree })
}
