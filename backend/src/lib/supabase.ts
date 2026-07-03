// Supabase client helper for Edge Functions
// Uses the Deno-compatible Supabase client

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getSupabaseClient(request: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = request.headers.get('Authorization')!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  return supabase;
}

export function getSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  return supabase;
}
