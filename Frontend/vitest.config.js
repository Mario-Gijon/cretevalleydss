import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_API_BACK": JSON.stringify("http://localhost:4010"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup/testSetup.js"],
    restoreMocks: true,
    clearMocks: true,
  },
});
