import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const env = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
}).parse(process.env);

export const supabaseServer = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);