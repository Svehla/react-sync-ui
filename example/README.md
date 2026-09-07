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

| Demo                                        | File                    | Shows                                                                                                           |
| ------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Awaiting a dialog like a function call      | `App.tsx`               | `await syncConfirm(...)` inside a plain `async` handler; follow-up dialogs queue instead of stacking            |
| Looping until the input is right            | `App.tsx`               | a `while` loop around `await syncRichPrompt(...)` - no "is the modal open" state                                |
| Cancelling: `props.reject` with `try/catch` | `App.tsx`               | closing a prompt calls `props.reject(...)`, the awaited promise rejects, a plain `try/catch` handles it         |
| Start hacking second queue                  | `secondQueue.tsx`       | a second, independent queue created with `syncUIFactory()`                                                      |
| Two independent queues at once              | `MultiQueuesApp.tsx`    | two factories draining in parallel while each queue stays FIFO                                                  |
| Pushing before `<SyncUI />` is mounted      | `PreMountQueueDemo.tsx` | calls made before the queue's `<SyncUI />` mounts are queued, not thrown away (plus the dev-only console error) |

Every demo is started by a click - nothing fires on mount, on purpose: under
`<StrictMode>` mount effects run twice in dev and each dialog would be pushed
twice.

The promisified dialogs live in `syncComponents/`. They are composed from
`ui/Dialog.tsx` (a ~55 line wrapper around the native `<dialog>` element) and
`ui/Button.tsx`; the whole look of the page is `styles.css`.

`ui/Dialog.tsx` opens itself in an effect on mount and closes on unmount. It
defaults to `showModal()`, which gives you a real `::backdrop` and native close
requests (Escape fires `cancel`) - but also makes the rest of the page inert, so
only one modal dialog can be interacted with at a time. The two-queue demos need
two dialogs clickable side by side, so they pass `modal={false}` and get
`show()` instead; the second-queue demo goes one step further and renders a
plain fixed panel.

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
- The queue factories and the dialogs built from them live in their own
  modules - `secondQueue.tsx`, `multiQueues.tsx`, `syncComponents/*`. These are
  not boundaries themselves (they export functions and objects, not components);
  their edits propagate one level up to the component file that imports them,
  which _is_ a boundary. Keeping the factories out of the component files also
  means a hot update never re-runs `syncUIFactory()` and never mounts a second
  `<SyncUI />` for the same queue.

Editing `syncComponents/SyncConfirm.tsx` with a dialog open should log
`[vite] hot updated: /App.tsx` and leave the dialog on screen. If you instead
see `[vite] invalidate` or a full reload, some file on the path picked up a
non-component export.

## Scripts

- `npm run dev` - dev server
- `npm run build` - production build into `dist/`
- `npm run preview` - serve the production build
- `npm run typecheck` - `tsc --noEmit`
