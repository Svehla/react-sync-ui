/**
 * Vite's `?raw` imports, used by the demo cards to show the real source of the
 * handler they run. `vite/client` declares this too, but the example's
 * `tsconfig.json` pins `types` to `["node"]`, so declare it explicitly.
 */
declare module "*?raw" {
  const content: string;
  export default content;
}
