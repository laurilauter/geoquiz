import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    //host: true,
  },
  build: {
    rollupOptions: {
      // https://rollupjs.org/guide/en/#big-list-of-options
    },
  },
});
