'use client';

/**
 * Supabase Client for Client-Side Components
 * Use this in 'use client' components for real-time subscriptions and client-side queries
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://')))
    ? envUrl
    : 'https://placeholder.supabase.co';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  return createBrowserClient<Database>(url, anon);
}

