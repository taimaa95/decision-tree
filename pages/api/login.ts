// pages/api/login.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { validateApiKey } from '../../services/authService'
import { serialize } from 'cookie'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[login] body:', req.body)

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const { apiKey } = req.body as { apiKey?: string }
  if (!apiKey) {
    return res.status(400).json({ error: 'Missing apiKey' })
  }

  const clientId = await validateApiKey(apiKey)
  console.log('[login] validated clientId:', clientId)
  if (!clientId) {
    return res.status(401).json({ error: 'Invalid API key' })
  }

  // Issue session cookie = client UUID
  res.setHeader(
    'Set-Cookie',
    serialize('session', clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })
  )
  return res.status(200).json({ success: true })
}
