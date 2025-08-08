// components/DecisionTree.tsx
import { useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type ReactFlowInstance,
} from 'reactflow'

import type { TreeNodeRecord, MessageRecord, FlowNode, FlowEdge } from '@/types/tree'
import { transformTree } from '@/utils/flowTransform'
import BackEdge from '@/components/CustomEdge'   // default export component
import NodeLabel from '@/components/NodeLabel'

// NOTE: Do NOT import 'reactflow/dist/style.css' here.
// Import global CSS once in pages/_app.tsx (per React Flow docs). :contentReference[oaicite:1]{index=1}

type Props = {
  nodes: TreeNodeRecord[]
  messages: MessageRecord[]
  rootId?: string
}

export default function DecisionTree({ nodes, messages, rootId }: Props) {
  const [warnings, setWarnings] = useState<string[]>([])
  const [showBackEdges, setShowBackEdges] = useState(true)

  // Controlled RF state: init empty, then set after transform
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<FlowNode>([])  // :contentReference[oaicite:2]{index=2}
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<FlowEdge>([])  // :contentReference[oaicite:3]{index=3}

  // Keep instance so we can fit AFTER nodes mount (avoids first-load jank)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

  // Transform Supabase rows -> RF nodes/edges (BFS layering; back edges classified in transform)
  useEffect(() => {
    let cancel = false
    ;(async () => {
      const res = await transformTree({ nodes, messages, rootId })
      if (cancel) return

      // Attach a visual label to each node
      const withLabels: FlowNode[] = res.flowNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          label: <NodeLabel userText={n.data.userText} botText={n.data.botText} />,
        } as any,
      }))

      setRfNodes(withLabels)
      setRfEdges(res.flowEdges)
      setWarnings(res.warnings)
    })()
    return () => {
      cancel = true
    }
  }, [nodes, messages, rootId, setRfNodes, setRfEdges])

  // Fit once nodes have been set (and when toggling back-edge visibility changes bbox)
  useEffect(() => {
    if (!rfInstance) return
    if (rfNodes.length === 0) return
    rfInstance.fitView({ padding: 0.2 })
  }, [rfInstance, rfNodes.length, showBackEdges])

  // Register custom edge type (must be a React component) :contentReference[oaicite:4]{index=4}
  const edgeTypes = useMemo(() => ({ backEdge: BackEdge }), [])

  // Toggle: hide edges classified as 'backward'
  const visibleEdges = useMemo(
    () =>
      showBackEdges
        ? rfEdges
        : rfEdges.filter((e) => e.data?.classification !== 'backward'),
    [rfEdges, showBackEdges]
  )

  return (
    <div style={{ width: '100%', height: '90vh' }}>
      <div style={{ padding: 8 }}>
        <label>
          <input
            type="checkbox"
            checked={showBackEdges}
            onChange={(e) => setShowBackEdges(e.target.checked)}
          />{' '}
          Show backward edges
        </label>
        {!!warnings.length && (
          <span style={{ marginLeft: 12, color: '#b35' }}>
            {warnings.length} warning{warnings.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <ReactFlow
        nodes={rfNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        edgeTypes={edgeTypes}
        onInit={setRfInstance} // store instance; fit after data arrives
        fitView
      >
        <Background gap={16} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  )
}
