import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://takvthfatlcjsqgssnta.supabase.co';
const PROXY_URL = `${SUPABASE_URL}/functions/v1/ai-settings-proxy`;

/**
 * Calls the ai-settings-proxy Edge Function which connects directly
 * to PostgreSQL, bypassing PostgREST (workaround for stale schema cache).
 */
export async function aiProxy<T = unknown>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      return { data: null, error: 'No session token available' };
    }

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...params }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result.error || `HTTP ${response.status}` };
    }

    return { data: result as T, error: null };
  } catch (e: any) {
    return { data: null, error: e.message || 'Network error' };
  }
}
