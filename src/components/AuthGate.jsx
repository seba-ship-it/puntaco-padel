import React, { useState } from 'react';
import { Lock, Unlock, X } from 'lucide-react';
import { SUPABASE_CONFIGURED } from '../lib/supabaseClient.js';

/**
 * Botón de candado en el header: cualquiera puede ver la liga sin esto, pero
 * cargar o corregir un resultado requiere entrar con la clave compartida.
 */
export default function AuthGate({ canEdit, onSignIn, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!SUPABASE_CONFIGURED) return null; // modo local: no hay nada que bloquear

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await onSignIn(password);
    setLoading(false);
    if (err) {
      setError('Clave incorrecta.');
      return;
    }
    setPassword('');
    setOpen(false);
  };

  if (canEdit) {
    return (
      <button
        onClick={onSignOut}
        title="Salir del modo edición"
        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors shrink-0"
      >
        <Unlock className="w-4 h-4" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ingresar clave para cargar resultados"
        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
      >
        <Lock className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={submit}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-xs space-y-3 pk-fade"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                Clave para cargar
              </h3>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Clave compartida"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
