import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_CONFIGURED = Boolean(url && anonKey);

// Email fijo del usuario compartido de Supabase Auth. Quien carga resultados
// solo necesita conocer la contraseña de esa cuenta (ver supabase/schema.sql).
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'encargado@puntaco.local';

export const supabase = SUPABASE_CONFIGURED ? createClient(url, anonKey) : null;
