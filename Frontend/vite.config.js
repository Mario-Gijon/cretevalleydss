import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    host: '0.0.0.0',  // Permite acceso desde fuera del contenedor
  },
  preview: {
    port: 5173, // Cambia el puerto aquí
  },
})
