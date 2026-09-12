import { defineConfig } from "vite";

export default defineConfig({
  define: {
    __CHECKOUT_ORIGIN__: JSON.stringify(
      process.env.VITE_CHECKOUT_ORIGIN || "http://localhost:5274",
    ),
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "EmbdCheckout",
      formats: ["iife"],
      fileName: () => "embd-checkout.js",
    },
    outDir: "../../apps/demo/public",
    emptyOutDir: false,
    sourcemap: true,
  },
});
