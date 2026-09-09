import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relativo, para que funcione en GitHub Pages sin importar el subdirectorio
  // (https://usuario.github.io/nombre-del-repo/).
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
