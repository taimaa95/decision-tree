// components/NodeLabel.tsx
import React from 'react'

export default function NodeLabel({ botText }: { botText: string }) {
  return (
    <div
      style={{
        whiteSpace: 'pre-wrap',
        lineHeight: 1.25,
        fontSize: 14,
      }}
    >
      {botText || ''}
    </div>
  )
}
