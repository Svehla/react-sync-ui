/// <reference types="vitest/config" />
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // Vite 8 transpiles TSX with Oxc; mirrors tsconfig's "jsx": "react-jsx".
  oxc: {
    jsx: { runtime: "automatic", importSource: "react" }
  },

  plugins: [
    dts({
      tsconfigPath: "./tsconfig.build.json",
      entryRoot: "src",
      outDirs: ["dist"],
      insertTypesEntry: true
    })
  ],

  build: {
    target: "es2020",
    sourcemap: true,
    // Libraries ship readable code; the consumer's bundler minifies.
    minify: false,
    emptyOutDir: true,
    lib: {
      entry: "src/index.ts",
      // ESM only. With "type": "module" this emits dist/index.js.
      formats: ["es"],
      fileName: "index"
    },
    rolldownOptions: {
      // Regex so that react/jsx-runtime is external too, not only "react".
      external: [/^react($|\/)/]
    }
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    typecheck: {
      include: ["test/**/*.test-d.ts"]
    },
    coverage: {
      provider: "v8",
      include: ["src/**"]
    }
  }
});
