// types/tree.ts
export type TreeNodeRecord = {
    id: string
    user_input_message_id: number
    bot_response_message_id: number
    user_options: Array<{ node_id: string; label: string }>
    is_root?: boolean        // ← add
  }
  
  export type MessageRecord = {
    id: number
    role: 'user' | 'assistant'
    content: string
  }
  
  export type FlowNode = import('reactflow').Node<{
    userText: string
    botText: string
    isRoot?: boolean
    label?: React.ReactNode
  }>
  
  export type FlowEdge = import('reactflow').Edge<{
    label: string
    classification: 'forward' | 'backward' | 'lateral' | 'broken'
  }>
  
  export type TransformResult = {
    flowNodes: FlowNode[]
    flowEdges: FlowEdge[]
    indices: {
      messageMap: Record<number, string>
      nodeById: Record<string, TreeNodeRecord>
      parents: Map<string, Set<string>>
      depth: Map<string, number>           // ← expose depth for editor logic
    }
    warnings: string[]
  }
  