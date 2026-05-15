import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";

const ii_url =
  process.env.DFX_NETWORK === "local"
    ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:8081/`
    : `https://identity.internetcomputer.org/`;

const storage_gateway =
  process.env.STORAGE_GATEWAY_URL || "https://blob.caffeine.ai";

// Resolve canister ID from multiple platforms
const resolvedCanisterId =
  process.env.VITE_CANISTER_ID_BACKEND ||
  process.env.CANISTER_ID_BACKEND ||
  "";

export default defineConfig({
  logLevel: "error",

  build: {
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
  },

  define: {
    // ICP Canister ID (Vercel + Vite standard)
    "import.meta.env.VITE_CANISTER_ID_BACKEND": JSON.stringify(
      process.env.VITE_CANISTER_ID_BACKEND ||
        process.env.CANISTER_ID_BACKEND ||
        ""
    ),

    // fallback raw canister ID
    "import.meta.env.CANISTER_ID_BACKEND": JSON.stringify(
      process.env.CANISTER_ID_BACKEND ||
        process.env.VITE_CANISTER_ID_BACKEND ||
        ""
    ),

    // Internet Identity URL
    "import.meta.env.II_URL": JSON.stringify(ii_url),

    // Storage gateway (used in backend uploads)
    "import.meta.env.STORAGE_GATEWAY_URL": JSON.stringify(storage_gateway),

    // expose resolved ID globally for fallback logic
    "window.__RESOLVED_CANISTER_ID_BACKEND": JSON.stringify(
      resolvedCanisterId
    ),
  },

  css: {
    postcss: "./postcss.config.js",
  },

  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },

  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },

  plugins: [
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    environment(["II_URL"]),
    environment(["STORAGE_GATEWAY_URL"]),
    react(),
  ],

  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(
          new URL("../declarations", import.meta.url)
        ),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
    dedupe: ["@dfinity/agent"],
  },
});
