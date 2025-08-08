// components/CustomEdge.tsx
import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
  } from 'reactflow';
  
  export default function BackEdge({
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
  }: EdgeProps) {
    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 8,
    });
  
    return (
      <>
        <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ strokeDasharray: '6 4', ...style }} />
        {data?.label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                background: '#444',
                color: '#fff',
                fontSize: 12,
                padding: '2px 6px',
                borderRadius: 6,
                pointerEvents: 'all',
              }}
            >
              {data.label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }
  