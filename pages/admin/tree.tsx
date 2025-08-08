// pages/admin/tree.tsx
import type { NextPage, GetServerSideProps } from 'next'
import { getTreePageProps, type TreePageProps } from '@/hooks/useTreeData'
import DecisionTree from '@/components/DecisionTree'

export const getServerSideProps: GetServerSideProps<TreePageProps> = getTreePageProps

const TreePage: NextPage<TreePageProps> = ({ nodes, messages }) => {
  return <DecisionTree nodes={nodes} messages={messages} />
}

export default TreePage
