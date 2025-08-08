// pages/login.tsx
import { useState } from 'react'
import { useRouter } from 'next/router'

export default function LoginPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    })

    setLoading(false)
    if (res.ok) {
      router.push('/admin/tree')
    } else {
      const body = await res.json().catch(() => ({}))
      setError((body.error as string) || 'Login failed')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20, border: '1px solid #ccc', borderRadius: 4 }}>
      <h1>Log In</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="apiKey">API Key</label>
        <input
          id="apiKey"
          type="text"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          style={{ width: '100%', padding: 8, margin: '8px 0' }}
          required
        />
        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Logging in…' : 'Log In'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
    </div>
  )
}
