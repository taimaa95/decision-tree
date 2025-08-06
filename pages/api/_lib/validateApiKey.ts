// pages/api/_lib/validateApiKey.ts
import { supabaseServer } from '../../../lib/supabaseServer'
import argon2 from 'argon2'
import { z } from 'zod'

// Validator for API keys hashed with Argon2
export async function validateApiKey(apiKey: string): Promise<string | null> {
  // Expect API key = 36-char UUID + secret
  const UUID_LEN = 36
  if (apiKey.length <= UUID_LEN) return null

  const clientId = apiKey.slice(0, UUID_LEN)

  // Fetch stored Argon2 hash
  const { data, error } = await supabaseServer
    .from('clients')
    .select('api_key_hash')
    .eq('id', clientId)
    .single()

  if (error || !data) {
    console.error('[validateApiKey] client lookup error:', error)
    return null
  }

  const hash = data.api_key_hash

  try {
    const valid = await argon2.verify(hash, apiKey)
    return valid ? clientId : null
  } catch (err) {
    console.error('[validateApiKey] argon2 verify error:', err)
    return null
  }
}
