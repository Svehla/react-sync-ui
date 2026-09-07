# Changelog

## 2.0.0

### Breaking changes

- **React peer dependency is now `^18.0.0 || ^19.0.0`** (was `>=16`). The
  queue is exposed to React through `useSyncExternalStore`, which ships with
  React 18.
- **ESM-only package.** `package.json` has `"type": "module"` and an `exports`
  map; the only code entry is `dist/index.js` (+ `dist/index.d.ts`), next to
  the `./package.json` subpath. The CJS build and `dist/react-sync-ui.esm.js`
  are gone.
- **Calling a sync function before `<SyncUI />` is mounted no longer throws**
  `You have to initialize <SyncUI />`. The item is queued and rendered as soon
  as a host mounts. In development a `console.error` is logged if items are
  still pending after 3 seconds and no `<SyncUI />` has ever mounted.
- **`resolve` / `reject` are bound to their own item and idempotent.** A second
  call for the same item, or a call from a stale closure after the item has
  left the queue, is a no-op instead of settling the _next_ caller's promise.
  This also applies to `usePromiseQueue().head.resolve/reject`.
- `usePromiseQueue` is now exported from the package entry (previously only
  reachable from `react-sync-ui/src/syncUI`).
- `reject` is typed as `(reason?: unknown) => void` (was `any`).
- `require("react-sync-ui")` now needs Node `>=20.19` / `>=22.12` (unflagged
  `require(esm)`); on older Node use `import` or a dynamic `import()`.

### Fixes

- Promise settlement no longer happens inside a `setState` updater. Under
  StrictMode / concurrent rendering the updater could be replayed against a
  different queue and settle the wrong promise with the wrong value.
- `makeSyncUI` called after `<SyncUI />` has mounted (lazy-loaded chunk, Vite
  HMR re-evaluating a module) now works; previously the first call threw.
- Mounting two `<SyncUI />` of the same factory no longer breaks pushes when
  either one unmounts. Only the first mounted host renders; a dev warning is
  logged for the duplicate.
- Unmounting `<SyncUI />` no longer loses queued items: the queue lives in the
  factory closure, so pending promises survive a remount (StrictMode, HMR,
  route changes).
- `<SyncUI />` inside a React 19.2 `<Activity mode="hidden">` subtree no
  longer jams the queue: going back to `visible` re-reads the store and
  restores the open dialog. (While hidden the host renders nothing, so the
  dialog's own local state starts over; the queue is untouched.)
- A sync component that throws during render is no longer a poison pill. An
  internal error boundary rejects that call's promise with the thrown error
  and renders the next queued item; the app's own error boundary is not
  triggered.
- Calling a sync function during server rendering only queues the item: the
  dev "no `<SyncUI />` is mounted" warning is not logged and no 3 s timer is
  scheduled when `typeof window === "undefined"`, so a Node process, lambda or
  test worker is no longer held open. `<SyncUI />` renders nothing on the
  server and hydrates cleanly, with pushes before and after hydration.
- Item keys use a monotonic counter instead of `Math.random()`.
- `<SyncUI />` renders only the head item's component instead of one wrapper
  per registered component.

### Types

- Added `SyncUIProps`, `SyncUIComponent`, `SyncUIFactory` and
  `PromiseQueueAPI` type exports.
- `SyncUIComponent<Data, Result>` is `ComponentType<SyncUIProps<Data, Result>>`
  instead of `(props) => ReactNode`, so `React.FC<SyncUIProps<...>>`, class
  components, `memo()` and `forwardRef()` are all accepted by `makeSyncUI`.
  (React 19's `FunctionComponent` returns `ReactNode | Promise<ReactNode>`,
  which the old signature rejected.)

### Tooling

- Build: Vite 8 library mode (`vite build`) with `unplugin-dts`, replacing
  tsdx. Sourcemaps included, output not minified.
- Tests: Vitest 4 + Testing Library 16 + jsdom, React 19 in devDependencies.
- ESLint 10 flat config with `typescript-eslint` and
  `eslint-plugin-react-hooks` v7, Prettier, husky 9 pre-commit hook, size-limit
  13, publint and are-the-types-wrong in `npm run check`.
- TypeScript 5.9, `jsx: react-jsx` (no `React` default import needed).
