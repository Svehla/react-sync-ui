# react-sync-ui example

A small Vite + React 19 playground for `react-sync-ui`. The dialogs are built
on the native `<dialog>` element plus one small stylesheet - no UI framework.

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

The page is one column: four everyday **demos**, then an **advanced** section
with the queue mechanics.

| Demo                                     | Handler                    | Shows                                                                                      |
| ---------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| Confirm before a destructive action      | `demos/confirmDelete.ts`   | `await syncConfirm(...)` returns the answer, so branching on it is a plain `if`            |
| Ask for a value                          | `demos/askName.ts`         | a prompt resolves with the typed value and _rejects_ on cancel, handled by `try/catch`     |
| Login with retries                       | `demos/login.ts`           | a `while` loop around an awaited prompt - no "is the modal open" state                     |
| A small wizard                           | `demos/pickPlan.ts`        | three chained steps (prompt, confirm, alert) read top to bottom                            |
| Two independent queues _(advanced)_      | `demos/twoQueues.ts`       | two `syncUIFactory()` queues draining in parallel while each stays FIFO                    |
| Calling before `<SyncUI />` _(advanced)_ | `demos/pushBeforeMount.ts` | calls made before the queue's host mounts are queued, not lost (plus the dev-only warning) |

Every demo is started by a click - nothing fires on mount, on purpose: under
`<StrictMode>` mount effects run twice in dev and each dialog would be pushed
twice.

### The demo modules and the code panels

Each handler lives in its own module under `demos/` and contains **no React**:
just an `async` function that awaits dialogs and calls a `trace(line)` callback
it is given. The page renders those lines under the demo as they arrive.

The card next to it imports the very same file twice:

```tsx
import source from "./demos/confirmDelete.ts?raw"; // the text, for the panel
import { confirmDelete } from "./demos/confirmDelete"; // the function, for the button
```

Vite's [`?raw`](https://vite.dev/guide/assets#importing-asset-as-string) suffix
gives back the file as a string, so the code you read on the page is always the
code the button runs. `vite-env.d.ts` declares that module suffix for TypeScript
(the example pins `types` to `["node"]`, so `vite/client` is not pulled in).

### The dialogs

The promisified dialogs live in `syncComponents/`. They are composed from
`ui/Dialog.tsx` (a small wrapper around the native `<dialog>` element) and
`ui/Button.tsx`; `ui/DemoCard.tsx`, `ui/CodePanel.tsx` and `ui/Trace.tsx` are
the page furniture, and the whole look is `styles.css` (light and dark via
`prefers-color-scheme`).

`ui/Dialog.tsx` opens itself in an effect on mount and closes on unmount. It
defaults to `showModal()`, which gives you a real `::backdrop` and native close
requests (Escape fires `cancel`) - but also makes the rest of the page inert, so
only one modal dialog can be interacted with at a time. The two-queue demo needs
two dialogs clickable side by side, so it passes `modal={false}` and gets
`show()` instead.

Every dialog has a `x` close button in its header (the same thing Escape and a
backdrop click do): on an alert it resolves like `OK`, on a confirm it answers
`No`, and on a prompt it calls `props.reject(...)` - the same as the prompt's
`Cancel` button - so the caller's `try/catch` runs.

In a confirm the accented answer sits **last**, on the right. That also makes
the declining button the first focusable child, which is what `showModal()`
focuses, so Enter never confirms a destructive action by accident.

## Fast Refresh

React Fast Refresh can only hot-swap a module whose **every export is a
component**. One extra export - a `syncUIFactory()` instance, a helper, a
constant - makes the file a non-boundary: Vite gives up on it
(`[vite] invalidate ...: Could not Fast Refresh ("x" export is incompatible)`),
walks up to its importers and, if it reaches the entry, does a full page reload,
which closes whatever dialog was open.

So the example is split along that rule:

- `main.tsx` is the entry only: it exports nothing, defines no component and
  just calls `createRoot`, so HMR must never re-execute it (re-running
  `createRoot` on the same container logs
  _"You are calling ReactDOMClient.createRoot() on a container that has already
  been passed to createRoot()"_).
- `App.tsx`, `MultiQueuesApp.tsx`, `PreMountQueueDemo.tsx` and the `ui/*` files
  export **only** components, so they are boundaries and absorb the update.
- The queue factories, the dialogs built from them and the demo handlers live in
  their own modules - `multiQueues.tsx`, `lateQueue.tsx`, `syncComponents/*`,
  `demos/*`. These are not boundaries themselves (they export functions and
  objects, not components); their edits propagate one level up to the component
  file that imports them, which _is_ a boundary. Keeping the factories out of
  the component files also means a hot update never re-runs `syncUIFactory()`
  and never mounts a second `<SyncUI />` for the same queue.

Editing `syncComponents/SyncConfirm.tsx` with a dialog open should log
`[vite] hot updated: /App.tsx` and leave the dialog on screen. If you instead
see `[vite] invalidate` or a full reload, some file on the path picked up a
non-component export.

## Scripts

- `npm run dev` - dev server
- `npm run build` - production build into `dist/`
- `npm run preview` - serve the production build
- `npm run typecheck` - `tsc --noEmit`
