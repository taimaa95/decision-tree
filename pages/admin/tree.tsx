// pages/admin/tree.tsx

import { GetServerSideProps, NextPage } from 'next'
import { parse } from 'cookie'
import ReactFlow, {
  Node as RFNode,
  Edge as RFEdge,
  Controls,
  Background,
  MarkerType,
  Position
} from 'react-flow-renderer'
import { supabaseServer } from '../../lib/supabaseServer'

type Row = {
  id: string
  user_input_message_id: number
  bot_response_message_id: number
  user_options: Array<{ node_id: string; label: string }>
  is_root: boolean
}

type Message = { id: number; content: string }

export const getServerSideProps: GetServerSideProps<{
  rfNodes: RFNode[]
  rfEdges: RFEdge[]
}> = async ({ req }) => {
  // 1️⃣ Auth guard
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {}
  const session = cookies.session
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } }
  }
  const CLIENT_ID = session

  // 2️⃣ Fetch all nodes for this client
  const { data: rows, error: rowsErr } = await supabaseServer
    .from<Row>('nodes')
    .select('id,user_input_message_id,bot_response_message_id,user_options,is_root')
    .eq('client_id', CLIENT_ID)

  if (rowsErr || !rows) {
    console.error(rowsErr)
    return { props: { rfNodes: [], rfEdges: [] } }
  }

  // 3️⃣ Fetch the messages they reference
  const msgIds = Array.from(
    new Set(
      rows.flatMap(r => [
        r.user_input_message_id,
        r.bot_response_message_id,
      ])
    )
  )
  const { data: messages } = await supabaseServer
    .from<Message>('messages')
    .select('id,content')
    .in('id', msgIds)

  // 4️⃣ Enrich into full TreeNode objects
  type TreeNode = {
    id: string
    botResponse: string
    userOptions: Array<{ node_id: string; label: string }>
    is_root: boolean
  }
  const tree: TreeNode[] = rows.map(r => {
    const botMsg = messages!.find(m => m.id === r.bot_response_message_id)!
    return {
      id: r.id,
      botResponse: botMsg.content,
      userOptions: r.user_options,
      is_root: r.is_root,
    }
  })

  // 5️⃣ Identify the root node
  const root = tree.find(n => n.is_root) ?? tree[0]
  const rootId = root.id

  // 6️⃣ Build forward-only adjacency (filter out any back-to-root)
  const forwardAdj: Record<string, string[]> = {}
  tree.forEach(n => {
    forwardAdj[n.id] = n.userOptions
      .filter(o => o.node_id !== rootId)   // drop any option that points to root
      .map(o => o.node_id)
  })

  // 7️⃣ BFS to compute depth & group siblings
  const depths: Record<string, number> = {}
  const siblings: Record<number, string[]> = {}
  const queue = [{ id: root.id, depth: 0 }]

  while (queue.length) {
    const { id, depth } = queue.shift()!
    if (depths[id] != null) continue

    depths[id] = depth
    siblings[depth] = siblings[depth] ?? []
    siblings[depth].push(id)

    const children = forwardAdj[id] || []
    children.forEach(childId =>
      queue.push({ id: childId, depth: depth + 1 })
    )
  }

  // 8️⃣ Build React-Flow nodes (all nodes now have top + bottom handles)
  const rfNodes: RFNode[] = []
  Object.entries(siblings).forEach(([depthStr, ids]) => {
    const depth = Number(depthStr)
    ids.forEach((id, idx) => {
      const node = tree.find(n => n.id === id)!
      rfNodes.push({
        id,
        data: { label: node.botResponse },
        position: {
          x: idx * 300 + 50,
          y: depth * 150 + 50,
        },
        sourcePosition: Position.Bottom,  // outgoing edges depart here
        targetPosition: Position.Top,     // incoming edges arrive here
      })
    })
  })

  // 9️⃣ Build forward edges only
  const forwardEdges: RFEdge[] = tree.flatMap(n =>
    n.userOptions
      .filter(o => o.node_id !== rootId)
      .map(o => ({
        id: `f-${n.id}-${o.node_id}`,
        source: n.id,
        target: o.node_id,
        label: o.label,
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed },
        type: 'smoothstep',            // nice curved look
      }))
  )

  // ── detect all leaves (no forward children) ─────────────
  const leafIds = Object.entries(forwardAdj)
    .filter(([, children]) => children.length === 0)
    .map(([id]) => id)

  // 🔟 Build back-edges from each leaf → root
  const backEdges: RFEdge[] = leafIds.map(leafId => ({
    id:           `b-${leafId}-${rootId}`,
    source:       leafId,            // start at leaf (bottom handle)
    target:       rootId,            // end at root (top handle)
    label:        'Main menu',
    type:         'smoothstep',
    style:        { strokeDasharray: '4 4', stroke: '#888' },
    markerEnd:    { type: MarkerType.ArrowClosed },
  }))

  return {
    props: {
      rfNodes,
      rfEdges: [...forwardEdges, ...backEdges],
    },
  }
}

const AdminTree: NextPage<{
  rfNodes: RFNode[]
  rfEdges: RFEdge[]
}> = ({ rfNodes, rfEdges }) => (
  <div style={{ width: '100vw', height: '100vh' }}>
    <ReactFlow nodes={rfNodes} edges={rfEdges} fitView>
      <Controls />
      <Background gap={16} />
    </ReactFlow>
  </div>
)

export default AdminTree
