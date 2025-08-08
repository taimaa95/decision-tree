// hooks/useTreeData.ts
import type {
    GetServerSidePropsContext,
    GetServerSidePropsResult,
  } from 'next'
  import { fetchTreeData } from '../services/treeService'
  import type { TreeNodeRecord, MessageRecord } from '../types/tree'
  
  export type TreePageProps = {
    nodes: TreeNodeRecord[]
    messages: MessageRecord[]
  }
  
  export async function getTreePageProps(
    ctx: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<TreePageProps>> {
    const clientId = ctx.req.cookies.session
    if (!clientId) {
      return { redirect: { destination: '/login', permanent: false } }
    }
  
    try {
      const { nodes, messages } = await fetchTreeData(clientId)
      return { props: { nodes, messages } }
    } catch (err) {
      console.error('[getTreePageProps] fetch error:', err)
      return { notFound: true }
    }
  }
  