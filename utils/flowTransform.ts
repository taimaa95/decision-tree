import dagre from 'dagre'
import type {
  TreeNodeRecord,
  MessageRecord,
  FlowNode,
  FlowEdge,
  TransformResult,
} from '@/types/tree'

// Node box and spacing
const NODE_W = 260
const NODE_H = 120
const RANKSEP = 220   // vertical distance between BFS depths (rows)
const NODESEP = 160   // horizontal distance between siblings
const BASE_Y  = 40    // top margin

function toMessageMap(messages: MessageRecord[]) {
  return Object.fromEntries(messages.map(m => [m.id, m.content])) as Record<number, string>
}
function toNodeMap(nodes: TreeNodeRecord[]) {
  return Object.fromEntries(nodes.map(n => [n.id, n])) as Record<string, TreeNodeRecord>
}
function buildParentsIndex(nodes: TreeNodeRecord[]) {
  const parents = new Map<string, Set<string>>()
  for (const n of nodes) {
    for (const opt of n.user_options) {
      if (!parents.has(opt.node_id)) parents.set(opt.node_id, new Set())
      parents.get(opt.node_id)!.add(n.id)
    }
    if (!parents.has(n.id)) parents.set(n.id, new Set())
  }
  return parents
}
function pickRoot(nodes: TreeNodeRecord[], parents: Map<string, Set<string>>) {
  const tag = nodes.find(n => n.is_root)
  if (tag) return tag.id
  const noIncoming = nodes.find(n => (parents.get(n.id)?.size ?? 0) === 0)
  if (noIncoming) return noIncoming.id
  return nodes[0]?.id
}

/** BFS over forward-only links (ignore structural loops back to root) */
function computeDepths(nodes: TreeNodeRecord[], rootId: string) {
  const byId = toNodeMap(nodes)
  const depth = new Map<string, number>()
  const q: string[] = []
  depth.set(rootId, 0)
  q.push(rootId)

  while (q.length) {
    const u = q.shift()!
    const d = depth.get(u)!
    for (const { node_id: v } of byId[u]?.user_options ?? []) {
      if (v === rootId) continue
      if (!byId[v]) continue
      if (!depth.has(v)) {
        depth.set(v, d + 1)
        q.push(v)
      }
    }
  }
  return depth
}

/** Dagre for X, BFS for Y (force rows by depth) */
function layoutWithDagre(
  nodes: TreeNodeRecord[],
  forwardEdges: Array<{ source: string; target: string }>,
  rootId: string,
  depth: Map<string, number>
) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'TB',
    ranker: 'longest-path',
    ranksep: RANKSEP,
    nodesep: NODESEP,
  } as dagre.GraphLabel)
  g.setDefaultEdgeLabel(() => ({}))

  for (const n of nodes) {
    g.setNode(n.id, {
      width: NODE_W,
      height: NODE_H,
      // keep root on first rank
      rank: n.id === rootId ? 'min' : undefined,
    })
  }
  for (const e of forwardEdges) {
    g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  // Build positions: use Dagre X (center -> top-left), override Y from BFS depth
  const pos: Record<string, { x: number; y: number }> = {}
  for (const id of g.nodes()) {
    const nd = g.node(id) as dagre.Node
    const xTopLeft = nd.x - NODE_W / 2
    const d = depth.get(id) ?? 0
    const centerY = BASE_Y + d * RANKSEP
    const yTopLeft = centerY - NODE_H / 2
    pos[id] = { x: xTopLeft, y: yTopLeft }
  }
  return pos
}

function classify(
  s: string,
  t: string,
  depth: Map<string, number>,
  broken?: boolean
): 'forward' | 'backward' | 'lateral' | 'broken' {
  if (broken) return 'broken'
  const ds = depth.get(s)
  const dt = depth.get(t)
  if (ds == null || dt == null) return 'forward'
  if (dt > ds) return 'forward'
  if (dt < ds) return 'backward'
  return 'lateral'
}

export async function transformTree(input: {
  nodes: TreeNodeRecord[]
  messages: MessageRecord[]
  rootId?: string
}): Promise<TransformResult> {
  const warnings: string[] = []
  const byId = toNodeMap(input.nodes)
  const messageMap = toMessageMap(input.messages)
  const parents = buildParentsIndex(input.nodes)

  const root = input.rootId && byId[input.rootId] ? input.rootId : pickRoot(input.nodes, parents)

  // 1) structure with BFS (semantic layers)
  const depth = computeDepths(input.nodes, root)

  // 2) layout with dagre using ONLY forward links, then force Y by depth
  const forwardEdgesForLayout: Array<{ source: string; target: string }> = []
  for (const n of input.nodes) {
    const ds = depth.get(n.id) ?? 0
    for (const { node_id: v } of n.user_options) {
      const dv = depth.get(v)
      if (dv != null && dv > ds) forwardEdgesForLayout.push({ source: n.id, target: v })
    }
  }
  const positions = layoutWithDagre(input.nodes, forwardEdgesForLayout, root, depth)

  // 3) RF nodes
  const flowNodes: FlowNode[] = input.nodes.map((n) => {
    const userText = messageMap[n.user_input_message_id]
    const botText = messageMap[n.bot_response_message_id]
    if (!userText) warnings.push(`Node ${n.id} missing user_input_message_id=${n.user_input_message_id}`)
    if (!botText) warnings.push(`Node ${n.id} missing bot_response_message_id=${n.bot_response_message_id}`)
    return {
      id: n.id,
      type: 'default',
      position: positions[n.id] ?? { x: 0, y: 0 },
      data: {
        userText: userText ?? '(missing user message)',
        botText: botText ?? '(missing bot message)',
        isRoot: n.id === root,
      },
    }
  })

  // 4) RF edges (forward/back/lateral) + warnings for broken
  const flowEdges: FlowEdge[] = []
  for (const n of input.nodes) {
    for (const opt of n.user_options) {
      const broken = !byId[opt.node_id]
      const cls = classify(n.id, opt.node_id, depth, broken)
      const isBack = cls === 'backward'

      flowEdges.push(
        isBack
          ? {
              id: `${n.id}::${opt.node_id}::${opt.label}`,
              source: n.id,
              target: opt.node_id,
              type: 'backEdge',
              data: { label: opt.label, classification: cls },
              markerEnd: { type: 'arrowclosed' },
            }
          : {
              id: `${n.id}::${opt.node_id}::${opt.label}`,
              source: n.id,
              target: opt.node_id,
              type: 'smoothstep',
              label: opt.label,
              data: { label: opt.label, classification: cls },
              markerEnd: { type: 'arrowclosed' },
              style: cls === 'broken' ? { stroke: '#d33', strokeDasharray: '4 4' } : undefined,
              labelStyle: cls === 'broken' ? { fill: '#d33' } : undefined,
            }
      )
      if (broken) warnings.push(`Edge ${n.id} -> ${opt.node_id} (${opt.label}) points to missing node`)
    }
  }

  return {
    flowNodes,
    flowEdges,
    indices: { messageMap, nodeById: byId, parents, depth },
    warnings,
  }
}
