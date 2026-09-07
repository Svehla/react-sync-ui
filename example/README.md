# react-sync-ui example

A small Vite + React 19 + reactstrap playground for `react-sync-ui`.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (http://localhost:5173 by default).

Requires Node `^20.19.0 || >=22.12.0`.

## How it is wired

The example does **not** consume the published package or `../dist`. Instead
`vite.config.ts` aliases `react-sync-ui` to `../src/index.ts`, so it runs
against the library source with full HMR - edit `src/` and the page updates.
`resolve.dedupe: ["react", "react-dom"]` makes sure `../src` and the example
share a single React copy.

`tsconfig.json` mirrors that with a `paths` entry, so `npm run typecheck`
(`tsc --noEmit`) type-checks the example _and_ the library source.

## What is in it

| Demo                                        | File                    | Shows                                                                                                           |
| ------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Awaiting a dialog like a function call      | `main.tsx`              | `await syncConfirm(...)` inside a plain `async` handler; follow-up dialogs queue instead of stacking            |
| Looping until the input is right            | `main.tsx`              | a `while` loop around `await syncPrompt(...)` - no "is the modal open" state                                    |
| Cancelling: `props.reject` with `try/catch` | `main.tsx`              | closing a prompt calls `props.reject(...)`, the awaited promise rejects, a plain `try/catch` handles it         |
| Start hacking second queue                  | `main.tsx`              | a second, independent queue created with `syncUIFactory()`                                                      |
| Two independent queues at once              | `MultiQueuesApp.tsx`    | two factories draining in parallel while each queue stays FIFO                                                  |
| Pushing before `<SyncUI />` is mounted      | `PreMountQueueDemo.tsx` | calls made before the queue's `<SyncUI />` mounts are queued, not thrown away (plus the dev-only console error) |

Every demo is started by a click - nothing fires on mount, on purpose: under
`<StrictMode>` mount effects run twice in dev and each dialog would be pushed
twice.

The promisified dialogs live in `syncComponents/`.

## Scripts

- `npm run dev` - dev server
- `npm run build` - production build into `dist/`
- `npm run preview` - serve the production build
- `npm run typecheck` - `tsc --noEmit`
