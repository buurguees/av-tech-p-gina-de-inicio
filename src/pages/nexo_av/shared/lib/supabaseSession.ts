import { supabase } from "@/integrations/supabase/client";

export async function getFreshAccessToken(): Promise<string> {
  let {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("No hay sesión activa. Inicia sesión de nuevo.");
  }

  if (session.expires_at && session.refresh_token) {
    const expiresAtMs = session.expires_at * 1000;
    const expiresSoon = expiresAtMs - Date.now() < 5 * 60 * 1000;

    if (expiresSoon) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token,
      });

      if (!refreshError && refreshed.session?.access_token) {
        return refreshed.session.access_token;
      }
    }
  }

  return session.access_token;
}

export async function forceRefreshAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data.session?.access_token) {
    throw new Error("No se pudo refrescar la sesión. Inicia sesión de nuevo.");
  }

  return data.session.access_token;
}
