# Puntako Pádel

Liga de pádel con tabla de posiciones, calendario, perfiles de jugador y carga
de resultados. Los datos viven en una base de datos de Supabase compartida
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

## Conectar con Supabase (una sola vez)

1. En tu proyecto de Supabase → **SQL Editor** → pegá y ejecutá
   [`supabase/schema.sql`](supabase/schema.sql). Crea la tabla, los permisos,
   y deja cargada la Fecha 1 de ambos grupos.
2. En **Authentication → Users → Add user**, creá un único usuario:
   - Email: `encargado@puntaco.local` (o el que hayas puesto en `VITE_ADMIN_EMAIL`)
   - Password: la que quieras que sea "la clave para cargar resultados"
   - Marcá **Auto Confirm User**.
3. En **Settings → API**, copiá el **Project URL** y la **anon public key**.
4. Copiá `.env.example` a `.env` y completá esos dos valores:
   ```bash
   cp .env.example .env
   ```
5. Reiniciá `npm run dev`. Ahora la app lee y escribe en Supabase, y aparece
   el candado 🔒 en el header para ingresar la clave.

## Publicar en internet (GitHub Pages)

1. Creá un repositorio en GitHub y subí este código.
2. En el repo → **Settings → Pages** → en "Build and deployment" elegí
   **Source: GitHub Actions**.
3. En **Settings → Secrets and variables → Actions**, agregá tres secrets
   (los mismos valores que pusiste en tu `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_EMAIL`
4. Cada `git push` a `main` dispara [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
   que compila la app y la publica. La URL queda en la pestaña "Actions" del
   repo, o en Settings → Pages una vez que corrió la primera vez.

## Cómo se usa una vez publicada

- **Cualquiera con el link** ve la tabla, las fechas y los perfiles.
- Para **cargar o corregir un resultado**, hay que tocar el candado 🔒 del
  header e ingresar la clave (la del paso 2 de arriba). Una vez adentro, se
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
  lib/storage.js         guardado: Supabase o localStorage según haya .env
  lib/supabaseClient.js  cliente de Supabase
  lib/auth.js            sesión de "quien carga" (la clave compartida)
  lib/exportImage.js     genera el PNG de la tabla para compartir
  components/            piezas de UI compartidas (toast, badges, reglas)
  views/                 cada pantalla (Tabla, Fechas, Cargar, Perfil, Liga)
  App.jsx                arma todo, maneja el estado y la navegación
supabase/schema.sql      esquema de la base de datos, para correr una vez
```
