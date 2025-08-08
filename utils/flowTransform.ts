// utils/flowTransform.ts
// Decide structure via BFS from root, place nodes by depth (rows), then add edges.
// Back edges = edges whose target depth < source depth.

import type {
    TreeNodeRecord,
    MessageRecord,
    FlowNode,
    FlowEdge,
    TransformResult,
  } from '@/types/tree'
  
  const COL_GAP = 360   // horizontal spacing between siblings
  const ROW_GAP = 220   // vertical spacing between depths
  const MARGIN_X = 60
  const MARGIN_Y = 40
  
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
  
  function pickRoot(nodes: TreeNodeRecord[], parents: Map<string, Set<string>>): string {
    const hasRoot = nodes.find(n => n.is_root)
    if (hasRoot) return hasRoot.id
    // fall back: node with no incoming edges
    const noIncoming = nodes.find(n => (parents.get(n.id)?.size ?? 0) === 0)
    if (noIncoming) return noIncoming.id
    // final fallback: first node
    return nodes[0]?.id
  }
  
  /** BFS over *forward-only* adjacency (ignore links to root to prevent structural loops) */
  function computeDepths(
    nodes: TreeNodeRecord[],
    rootId: string
  ): { depth: Map<string, number>; siblings: Map<number, string[]> } {
    const depth = new Map<string, number>()
    const siblings = new Map<number, string[]>()
    const q: string[] = []
  
    depth.set(rootId, 0)
    q.push(rootId)
    siblings.set(0, [rootId])
  
    const byId = toNodeMap(nodes)
  
    while (q.length) {
      const u = q.shift()!
      const d = depth.get(u)!
      const out = byId[u]?.user_options ?? []
  
      for (const { node_id: v } of out) {
        if (v === rootId) continue               // ignore links back to root for structure
        if (!byId[v]) continue                   // dangling target? ignore for structure
        if (!depth.has(v)) {
          depth.set(v, d + 1)
          const arr = siblings.get(d + 1) ?? []
          arr.push(v)
          siblings.set(d + 1, arr)
          q.push(v)
        }
      }
    }
    return { depth, siblings }
  }
  
  /** Deterministic positions: y by depth (row), x by sibling index (column) */
  function placeNodes(
    depth: Map<string, number>,
    siblings: Map<number, string[]>,
    messageMap: Record<number, string>,
    rootId?: string
  ): FlowNode[] {
    const nodes: FlowNode[] = []
    const maxWidthByRow = new Map<number, number>()
  
    // sort each row by user text (stable-ish); fallback by id
    for (const [d, arr] of siblings) {
      arr.sort((a, b) => (a.localeCompare(b)))
      maxWidthByRow.set(d, arr.length)
    }
  
    for (const [d, arr] of siblings) {
      const y = MARGIN_Y + d * ROW_GAP
      const width = maxWidthByRow.get(d) ?? arr.length
      const totalW = Math.max(1, width - 1) * COL_GAP
      for (let i = 0; i < arr.length; i++) {
        const id = arr[i]
        const x = MARGIN_X + (i * COL_GAP) - totalW / 2  // center the row
  
        nodes.push({
          id,
          type: 'default',
          position: { x, y },
          data: {
            userText: messageMap[(window as any)?._noop ?? 0], // placeholder; override later
            botText: '',
            isRoot: id === rootId,
          },
        } as FlowNode)
      }
    }
    return nodes
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
  
    // BFS structure
    const { depth, siblings } = computeDepths(input.nodes, root)
  
    // Place nodes deterministically
    const flowNodes = placeNodes(depth, siblings, messageMap, root).map(n => {
      const rec = byId[n.id]
      const userText = messageMap[rec?.user_input_message_id ?? -1]
      const botText = messageMap[rec?.bot_response_message_id ?? -1]
      if (!userText) warnings.push(`Node ${n.id} missing user_input_message_id=${rec?.user_input_message_id}`)
      if (!botText) warnings.push(`Node ${n.id} missing bot_response_message_id=${rec?.bot_response_message_id}`)
      return {
        ...n,
        data: {
          ...n.data,
          userText: userText ?? '(missing user message)',
          botText: botText ?? '(missing bot message)',
        },
      }
    })
  
    // Build all edges; classify AFTER depths are known
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
  