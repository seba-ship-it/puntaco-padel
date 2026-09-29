import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { auth, CLOUD_CONFIGURED, ADMIN_EMAIL } from './firebaseClient.js';

/**
 * Sesión de "quien carga resultados". Es una única cuenta compartida de
 * Firebase Auth: no hay usuarios individuales, solo una clave que se comparte
 * con quien va a cargar fechas. Las reglas de Firestore (firestore.rules)
 * dejan escribir únicamente a esa cuenta.
 *
 * Sin Firebase configurado (desarrollo local sin .env) no hay nada que
 * bloquear: se puede editar libremente.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!CLOUD_CONFIGURED);

  useEffect(() => {
    if (!CLOUD_CONFIGURED) return undefined;
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setReady(true);
    });
  }, []);

  const signIn = useCallback(async (password) => {
    if (!CLOUD_CONFIGURED) return { error: null };
    try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (CLOUD_CONFIGURED) await fbSignOut(auth);
  }, []);

  /** Manda un mail con un link para elegir una clave nueva. */
  const sendPasswordReset = useCallback(async () => {
    if (!CLOUD_CONFIGURED) return { error: null };
    try {
      await sendPasswordResetEmail(auth, ADMIN_EMAIL);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }, []);

  const canEdit = !CLOUD_CONFIGURED || Boolean(user);

  return { ready, canEdit, signIn, signOut, sendPasswordReset };
}
