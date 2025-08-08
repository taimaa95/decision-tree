// pages/index.tsx
import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const hasSession = Boolean(req.cookies.session)
  return {
    redirect: {
      destination: hasSession ? '/admin/tree' : '/login',
      permanent: false,
    },
  }
}

export default function Index() {
  return null
}
