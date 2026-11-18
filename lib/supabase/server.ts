import { cookies } from 'next/headers';
import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { isMasterAccountEnabled } from '@/lib/config';

/**
 * Supabase Client for Server Components (RSC)
 * Caches the client for the lifetime of the request
 * @deprecated Use createServerClientRSC instead
 */
export const createServerClient = async () => {
  return createServerClientRSC();
};

/**
 * For Server Components (read-only cookies)
 */
export async function createServerClientRSC() {
  const cookieStore = await cookies();

  // If master account is enabled, use the service role client for all server-side operations
  if (isMasterAccountEnabled()) {
    return createServiceRoleClient();
  }

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://')))
    ? envUrl
    : 'https://placeholder.supabase.co';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createSupabaseServerClient<Database>(
    url,
    anon,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(_name: string, _value: string, _options: CookieOptions) {
          // Server Components cannot set cookies
        },
        remove(_name: string, _options: CookieOptions) {
          // Server Components cannot remove cookies
        },
      },
    }
  );
}

export function createServiceRoleClient() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://')))
    ? envUrl
    : 'https://placeholder.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';
  
  return createServiceClient<Database>(url, serviceKey, {
    auth: { 
      autoRefreshToken: false, 
      persistSession: false 
    },
  });
}
