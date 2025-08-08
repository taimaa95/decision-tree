// components/CustomEdge.tsx
import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
  } from 'reactflow'
  import { useMemo } from 'react'
  
  export default function BackEdge(props: EdgeProps) {
    const {
      id,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      markerEnd,
      style,
      data,
    } = props
  
    // 1) Build the edge path + default midpoint from RF util
    const [path, midX, midY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 8,
    })
  
    // 2) Compute **local** tangent + normal at the midpoint using SVG path sampling
    const { lx, ly } = useMemo(() => {
      // SSR guard
      if (typeof window === 'undefined') {
        return { lx: midX, ly: midY }
      }
  
      const svgNS = 'http://www.w3.org/2000/svg'
      const el = document.createElementNS(svgNS, 'path')
      el.setAttribute('d', path)
  
      // total length & a tiny epsilon around the middle
      const L = el.getTotalLength()
      if (!Number.isFinite(L) || L === 0) return { lx: midX, ly: midY }
  
      const mid = L / 2
      const eps = 1 // px along the path
      const p1 = el.getPointAtLength(Math.max(0, mid - eps))
      const p2 = el.getPointAtLength(Math.min(L, mid + eps))
  
      // unit tangent (p1->p2), then unit normal
      const tx = p2.x - p1.x
      const ty = p2.y - p1.y
      const len = Math.hypot(tx, ty) || 1
      const ux = tx / len
      const uy = ty / len
      const nx = -uy
      const ny = ux
  
      // Put backward labels on the "other side" and a touch downstream
      const PERP_OFFSET = 16
      const ALONG_OFFSET = 12
      const offX = midX + nx * PERP_OFFSET + ux * ALONG_OFFSET
      const offY = midY + ny * PERP_OFFSET + uy * ALONG_OFFSET
  
      return { lx: offX, ly: offY }
    }, [path, midX, midY])
  
    return (
      <>
        <BaseEdge
          id={id}
          path={path}
          markerEnd={markerEnd}
          style={{ strokeDasharray: '6 4', ...style }}
        />
  
        {data?.label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`,
                background: '#444',
                color: '#fff',
                fontSize: 12,
                padding: '2px 6px',
                borderRadius: 6,
                pointerEvents: 'none',
                zIndex: 10,
                whiteSpace: 'nowrap',
              }}
            >
              {data.label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    )
  }
  