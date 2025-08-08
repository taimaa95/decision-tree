// services/authService.ts
import { supabase } from '../lib/supabase'
import argon2 from 'argon2'
import type { ApiKey } from '../types/auth'

/**
 * Verifies an Argon2‐hashed API key.
 * Returns the client UUID on success, or null on failure.
 */
export async function validateApiKey(apiKey: ApiKey): Promise<string | null> {
  const UUID_LEN = 36
  if (apiKey.length <= UUID_LEN) return null

  const clientId = apiKey.slice(0, UUID_LEN)

  // Fetch stored hash
  const { data, error } = await supabase
    .from('clients')
    .select('api_key_hash')
    .eq('id', clientId)
    .single()

  if (error || !data) {
    console.error('[authService] client lookup error:', error)
    return null
  }

  try {
    const isValid = await argon2.verify(data.api_key_hash, apiKey)
    return isValid ? clientId : null
  } catch (err) {
    console.error('[authService] argon2 verify error:', err)
    return null
  }
}
