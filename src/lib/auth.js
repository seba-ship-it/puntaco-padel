import { useEffect, useState, useCallback } from 'react';
import { supabase, SUPABASE_CONFIGURED, ADMIN_EMAIL } from './supabaseClient.js';

/**
 * Sesión de "quien carga resultados". Es una única cuenta compartida de
 * Supabase Auth (ver supabase/schema.sql) — no hay usuarios individuales,
 * solo una clave que se comparte con quien va a cargar fechas.
 *
 * Sin Supabase configurado (desarrollo local sin .env), no hay nada que
 * bloquear: se puede editar libremente, igual que antes.
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!SUPABASE_CONFIGURED);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (password) => {
    if (!SUPABASE_CONFIGURED) return { error: null };
    const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) return;
    await supabase.auth.signOut();
  }, []);

  const canEdit = !SUPABASE_CONFIGURED || Boolean(session);

  return { ready, canEdit, signIn, signOut };
}
