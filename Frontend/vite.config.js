import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from "vite-plugin-svgr";

                           
export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    host: '0.0.0.0',                                              
  },
  preview: {
    port: 5173,                         
  },
})
