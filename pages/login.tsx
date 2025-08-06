import { useState } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const [apiKey, setApiKey] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    if (res.ok) router.push('/admin/tree');
    else alert('Invalid API key');
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="text-xl font-bold">Log in with API Key</h1>
        <input
          type="text"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Enter your API Key"
          className="border p-2 w-80"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Login
        </button>
      </form>
    </div>
  );
}