# Puntako Pádel

Liga de pádel con tabla de posiciones, calendario, perfiles de jugador y carga
de resultados. Los datos viven en una base de datos de Firebase (Firestore) compartida
por todos; cualquiera con el link puede ver la liga, y cargar o corregir un
resultado requiere una clave única.

## Desarrollo local

```bash
npm install
npm run dev
```

Sin un archivo `.env`, la app funciona en **modo local**: guarda todo en el
navegador (como antes) y no pide ninguna clave para editar. Es el modo normal
para programar y probar cosas sin tocar la base de datos real.

## Conectar con Firebase (una sola vez)

1. Creá un proyecto en la [consola de Firebase](https://console.firebase.google.com)
   y una **app web** (Configuración del proyecto → Tus apps).
2. **Firestore Database** → crear base de datos (modo producción).
3. **Authentication** → Sign-in method → habilitar **Correo/contraseña**, y
   crear un único usuario con el email de `VITE_ADMIN_EMAIL`. Su contraseña es
   "la clave para cargar resultados" (se puede cambiar con "Olvidé la clave").
4. Publicá las reglas de seguridad: `npx firebase-tools deploy --only firestore:rules`
   (usa [`firestore.rules`](firestore.rules): lectura pública de la liga,
   escritura y pagos solo para la cuenta del encargado; si cambiás el email,
   cambialo también ahí).
5. Copiá `.env.example` a `.env` y completá los datos de la app web.

## Publicar en internet (GitHub Pages)

1. Subí este código a un repositorio de GitHub.
2. En el repo → **Settings → Pages** → **Source: GitHub Actions**.
3. En **Settings → Secrets and variables → Actions**, cargá los mismos valores
   del `.env`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` y `VITE_ADMIN_EMAIL`.
4. Cada `git push` a `main` dispara [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
   que compila y publica la app.
   Además, en Authentication → Settings → Authorized domains, agregá el dominio donde se publique.

## Cómo se usa una vez publicada

- **Cualquiera con el link** ve la tabla, las fechas y los perfiles.
- Para **cargar o corregir un resultado**, hay que tocar el candado 🔒 del
  header e ingresar la clave (la del paso 3 de arriba). Una vez adentro, se
  puede cargar cualquier fecha, agregar jugadores, editar el calendario, etc.
- Si dos personas cargan resultados en simultáneo desde dispositivos
  distintos, la última en guardar es la que queda — no hay fusión automática
  de cambios. Para una liga chica esto no suele ser un problema real.
- *Liga → Backup* permite bajar una copia de toda la temporada en un archivo,
  además de la base de datos.

## Estructura del proyecto

```
src/
  data/defaults.js       jugadores y calendario iniciales (solo la semilla)
  lib/scoring.js         toda la matemática de puntos — sin React, con tests
  lib/storage.js         guardado: Firestore o localStorage según haya .env
  lib/firebaseClient.js  cliente de Firebase
  lib/season.js          cierre de temporada, ascensos, descensos y repechaje
  lib/auth.js            sesión de "quien carga" (la clave compartida)
  lib/exportImage.js     genera el PNG de la tabla para compartir
  components/            piezas de UI compartidas (toast, badges, reglas)
  views/                 cada pantalla (Tabla, Fechas, Cargar, Perfil, Liga)
  App.jsx                arma todo, maneja el estado y la navegación
firestore.rules          reglas de seguridad de la base de datos
```
