import react from "@vitejs/plugin-react";
import unocss from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [unocss(), react()],
});
