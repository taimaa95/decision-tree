// components/NodeLabel.tsx
export default function NodeLabel({ userText, botText }: { userText: string; botText: string }) {
    return (
      <div style={{ fontSize: 12, lineHeight: 1.25 }}>
        <div><strong>You:</strong> {userText}</div>
        <div><strong>Bot:</strong> {botText}</div>
      </div>
    )
  }
  