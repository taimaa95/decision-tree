// services/treeService.ts
import { supabase } from '@/lib/supabase'
import type { TreeNodeRecord, MessageRecord } from '@/types/tree'

export async function fetchTreeData(clientId: string) {
  const [nodesRes, msgsRes] = await Promise.all([
    supabase
      .from<TreeNodeRecord>('nodes')
      .select('id, user_input_message_id, bot_response_message_id, user_options, is_root')  // ← add is_root
      .eq('client_id', clientId),

    supabase
      .from<MessageRecord>('messages')
      .select('id, role, content'),
  ])

  if (nodesRes.error || msgsRes.error) {
    throw new Error(nodesRes.error?.message || msgsRes.error?.message)
  }
  return { nodes: nodesRes.data!, messages: msgsRes.data! }
}
