import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const resolvePath = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // run the example against the library SOURCE - no build step, full HMR
      "react-sync-ui": resolvePath("../src/index.ts")
    },
    // ../src lives outside this package, so its `import ... from "react"` would
    // otherwise resolve to the repo-root node_modules and we'd load two Reacts.
    // dedupe forces every react/react-dom import to example/node_modules.
    dedupe: ["react", "react-dom"]
  },
  server: {
    fs: {
      // serve ../src from the dev server (usually already covered by the
      // detected workspace root, kept explicit so it never breaks)
      allow: [resolvePath(".."), resolvePath(".")]
    }
  }
});
