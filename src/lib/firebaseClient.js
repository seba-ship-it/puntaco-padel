import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Sin estas variables (desarrollo local sin .env) la app funciona en modo local.
export const CLOUD_CONFIGURED = Boolean(config.apiKey && config.projectId);

// Email fijo de la cuenta compartida de quien carga. Solo hace falta conocer su clave.
export const ADMIN_EMAIL = env.VITE_ADMIN_EMAIL || 'encargado@puntako.local';

const app = CLOUD_CONFIGURED ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
