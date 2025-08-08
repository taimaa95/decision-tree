// components/edges/BackEdge.tsx
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from 'reactflow'
import type { EdgeProps } from 'reactflow'

export default function BackEdge(props: EdgeProps) {
  const {
    id, sourceX, sourceY, targetX, targetY, data,
  } = props

  // slight “upward” arc using smooth step (clean + simple)
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    borderRadius: 8,
    offset: 30,             // increases curvature
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ strokeDasharray: '6 6', strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            padding: '2px 6px',
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            borderRadius: 4,
            fontSize: 11,
            pointerEvents: 'all',
          }}
        >
          ↩ {data?.label}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
