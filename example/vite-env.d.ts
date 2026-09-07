/**
 * Vite's ambient module types: `*.css` side-effect imports and the `?raw`
 * imports the demo cards use to show the real source of the handler they run.
 * The example's `tsconfig.json` pins `types` to `["node"]`, so pull them in
 * explicitly instead of relying on automatic @types inclusion.
 */
/// <reference types="vite/client" />
