# react-sync-ui

[![npm version](https://img.shields.io/npm/v/react-sync-ui.svg)](https://www.npmjs.com/package/react-sync-ui)
[![license](https://img.shields.io/npm/l/react-sync-ui.svg)](./LICENSE)

`react-sync-ui` turns a React component into a function you can `await`: calling it renders the component,
and the promise it returns settles when the component calls `resolve` or `reject`.

A dialog then becomes part of ordinary control flow — `if`, `while`, `try/catch` — inside one async
function, instead of an "is the modal open" flag threaded through props, state and effects.

```tsx
const askForFeedback = async () => {
  const likesIt = await syncConfirm("Do you like this library?");

  if (likesIt) {
    await syncAlert("Thanks, we like you too");
  } else if (await syncConfirm("Are you sure?")) {
    await syncAlert("Give it a second try");
  } else {
    await syncAlert("Thanks, we like you too");
  }
};
```

> `syncAlert`, `syncConfirm` and `syncPrompt` are not shipped by the library — they are **your own**
> components, promisified with `makeSyncUI`. Their source is in [Recipes](#recipes).

![Decision tree built from awaited dialogs](https://github.com/Svehla/react-sync-ui/blob/main/docs/decision-tree-sync-ui.gif?raw=true)

## Install

```bash
npm i react-sync-ui
```

React `^18 || ^19` is a peer dependency. See [Compatibility](#compatibility) for the packaging.

## Quick start

### 1. Mount SyncUI once

```tsx
import { createRoot } from "react-dom/client";
import { SyncUI } from "react-sync-ui";

const App = () => (
  <>
    <SyncUI />
    <YourAppStuff />
  </>
);

createRoot(document.getElementById("root")!).render(<App />);
```

Your promisified components render there, so the placement matters — see
[Where to mount SyncUI](#where-to-mount-syncui).

### 2. Promisify a component

`makeSyncUI` takes a component and returns a **function**. The component receives exactly three props:
`data` (whatever the caller passed in), `resolve` and `reject`.

```tsx
import { makeSyncUI } from "react-sync-ui";

export const syncAlert = makeSyncUI<string, void>(props => (
  <dialog open>
    <p>{props.data}</p>
    <button onClick={() => props.resolve()}>OK</button>
  </dialog>
));
```

### 3. Await it

```ts
await syncAlert("Your changes are saved");
```

Any handler, saga or plain async function can await it — no context, hook or provider at the call site.

## Why react-sync-ui exists

When a use case composes async work with user decisions — fetch, ask, branch, ask again — the business
logic ends up scattered over handlers, `useState` flags and `useEffect` dependencies. The workflow turns
into event-driven code: to follow the sequence you first have to reconstruct it from the components
reacting to each other, and a newcomer has no chance.

Promisifying a component puts the sequence back into a single function. The UI stays declarative and
small, while the workflow reads top to bottom.

```tsx
const login = async () => {
  const name = await syncPrompt("Fill your name");
  while ((await syncPrompt("Fill your password!")) !== "1234") {
    await syncAlert("Invalid password, keep trying");
  }
  await syncAlert(`Congratulation ${name}, you are logged in`);
};
```

![A while-true login loop driven by awaited dialogs](https://github.com/Svehla/react-sync-ui/blob/main/docs/while-true-sync-ui.gif?raw=true)

PS: the inspiration is `window.alert`, `window.confirm` and `window.prompt`. ❤

## Recipes

Three dialogs on the native `<dialog>` element, no UI framework. Each opens itself with `showModal()` on
mount and has a close button next to whatever Escape (`onCancel`) does. All three run in
[example/](https://github.com/Svehla/react-sync-ui/tree/main/example) — `npm install && npm run dev` there
starts the playground against the library source.

### Alert

```tsx
import { useEffect, useRef } from "react";
import { makeSyncUI } from "react-sync-ui";

export const syncAlert = makeSyncUI<string, void>(props => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => void ref.current?.showModal(), []);

  // an alert has nothing to decide: the close button and Escape both mean OK
  return (
    <dialog ref={ref} onCancel={() => props.resolve()}>
      <h2>{props.data}</h2>
      <button aria-label="Close" onClick={() => props.resolve()}>
        ×
      </button>
      <button onClick={() => props.resolve()}>OK</button>
    </dialog>
  );
});
```

### Confirm

```tsx
import { useEffect, useRef } from "react";
import { makeSyncUI } from "react-sync-ui";

type ConfirmData = { title: string; description?: string };

export const syncRichConfirm = makeSyncUI<ConfirmData, boolean>(props => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => void ref.current?.showModal(), []);

  // closing a confirm without answering is a "no"
  const no = () => props.resolve(false);

  return (
    <dialog ref={ref} onCancel={no}>
      <h2>{props.data.title}</h2>
      <button aria-label="Close" onClick={no}>
        ×
      </button>
      <p>{props.data.description}</p>
      <button autoFocus onClick={() => props.resolve(true)}>
        Yes
      </button>
      <button onClick={no}>No</button>
    </dialog>
  );
});

// a thin positional wrapper for the common call site
export const syncConfirm = (title: string) => syncRichConfirm({ title });
```

### Prompt

A prompt has no neutral answer, so closing it rejects — and every caller has to handle that.

```tsx
import { useEffect, useRef, useState } from "react";
import { makeSyncUI } from "react-sync-ui";

export const syncPrompt = makeSyncUI<string, string>(props => {
  const ref = useRef<HTMLDialogElement>(null);
  const [input, setInput] = useState("");
  useEffect(() => void ref.current?.showModal(), []);

  const cancel = () => props.reject(new Error("User closed the prompt"));

  return (
    <dialog ref={ref} onCancel={cancel}>
      <button aria-label="Close" onClick={cancel}>
        ×
      </button>
      <label>
        {props.data}
        <input
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
        />
      </label>
      <button onClick={() => props.resolve(input)}>Accept</button>
    </dialog>
  );
});

// at the call site
try {
  console.log(await syncPrompt("How are you?"));
} catch {
  console.log("user cancelled the prompt");
}
```

## How the queue works

- Every factory owns **one FIFO queue** and `<SyncUI />` renders its head, so one dialog is on screen at a
  time. All components of the same factory share that queue, so a `syncAlert` and a `syncConfirm` never
  overlap: `await Promise.all([syncAlert("1"), syncAlert("2")])` shows two dialogs one after another.
- Every call gets a **fresh React key**, so your component's local state starts clean each time.
- Calling a sync function **before `<SyncUI />` is mounted is fine**: the item waits and is rendered as
  soon as a host mounts. In development a console error is logged if items are still pending after 3
  seconds and no `<SyncUI />` has ever mounted.
- Unmounting `<SyncUI />` does **not** drop the queue: pending promises stay pending and are rendered
  again by the next host that mounts.
- Need two dialogs side by side? Use [multiple queues](#multiple-queues).

## Errors and cancellation

`props.reject(reason)` rejects the awaited promise, which is how you model "the user closed the dialog" —
see the [Prompt recipe](#prompt) for both halves of it.

- Nothing catches for you: an uncaught rejection is a real unhandled promise rejection, a call you never
  awaited included. Wrap the `await` in `try/catch` whenever a component can reject.
- `props.reject()` with **no argument** rejects with `new Error("react-sync-ui: rejected without a reason")`,
  so `catch (error) { error.message }` never throws on top of the cancellation. Pass your own reason when
  the caller has to tell one apart from another.
- `resolve` and `reject` are **bound to their own call** and settle it at most once: a second call, or one
  from a dialog that already closed (a late HTTP response, a double click), is a no-op and can never settle
  the next caller's promise.
- Settling pops the head and the next dialog opens immediately — `resolve(promise)` opens it while your
  caller still awaits the inner promise, so resolve with a value, not a thenable.
- A component that **throws during render** is rejected with the thrown error by an internal error boundary
  and the queue keeps draining. Your own error boundary is not triggered, so catch the call to see what
  happened.
- Unmounting the component that owns a [`usePromiseQueue`](#usepromisequeue) rejects everything queued in it.

## Where to mount SyncUI

Your promisified components are rendered **inside** `<SyncUI />`, not where you called them, so `<SyncUI />`
has to live inside every context provider they rely on: theme (`ThemeProvider`, MUI, Chakra), router
(`react-router` — a dialog calling `useNavigate` throws otherwise), i18n and stores (`Provider`,
`QueryClientProvider`, `ApolloProvider`). Rule of thumb: **as deep as the deepest provider it needs**.
Modals usually render into a portal, so extra depth costs you nothing in CSS stacking.

Mount it **once per factory**. If more than one `<SyncUI />` of the same factory is mounted, only the
first-mounted one renders and a warning is logged in development.

## TypeScript

`makeSyncUI<InputData, ResolveValue = void>(Component)` carries two type parameters through to the
promise:

- `InputData` is the argument of the returned function and the type of `props.data`.
- `ResolveValue` is what `props.resolve` accepts and what the promise resolves with. It defaults to `void`,
  so `makeSyncUI<string>(Comp)` is `(data: string) => Promise<void>` and `props.resolve()` takes no argument.
- For more than one input use an object payload plus a thin positional wrapper, as `syncRichConfirm` /
  `syncConfirm` above do.
- `SyncUIProps` and `SyncUIComponent` are exported, so you can declare the component separately — inline
  arrows, function declarations, `React.FC<SyncUIProps<string, boolean>>`, `memo()`, `forwardRef()` and
  classes are all accepted. `SyncUIFunction` names what `makeSyncUI` returns, for wrappers, context values
  and props types.

## Advanced

### Multiple queues

The `makeSyncUI` and `SyncUI` you import from `react-sync-ui` come from one default queue:

```ts
export const { makeSyncUI, SyncUI } = syncUIFactory();
```

Every call to `syncUIFactory()` creates a **completely independent queue** with its own `makeSyncUI` and
its own `SyncUI`. Two queues show two dialogs at the same time, while calls inside a single queue still
line up one after another. A factory's components are only rendered by **that** factory's `<SyncUI />`, so
mount one `<SyncUI />` per factory.

```tsx
import { syncUIFactory } from "react-sync-ui";

export const queueA = syncUIFactory();
export const queueB = syncUIFactory();

export const alertA = queueA.makeSyncUI<string, void>(p => (
  <MyDialog text={p.data} onClose={p.resolve} />
));
export const alertB = queueB.makeSyncUI<string, void>(p => (
  <MyDialog text={p.data} onClose={p.resolve} />
));

// with <queueA.SyncUI /> and <queueB.SyncUI /> both mounted:
await Promise.all([alertA("a-1"), alertB("b-1")]); // two dialogs at once
```

A full version is in
[example/MultiQueuesApp.tsx](https://github.com/Svehla/react-sync-ui/blob/main/example/MultiQueuesApp.tsx).

### usePromiseQueue

The low-level hook behind the library, exported for the rare case where you want to own the rendering.
`usePromiseQueue<InputData, ResolveValue>()` returns `{ head?: { data, resolve, reject }, push }`:
`push(data)` appends an item and returns a promise, `head` is the first queued item (`undefined` when
empty), and `head.resolve` / `head.reject` settle exactly that item.

Each calling component gets its **own** queue — not the default factory's — so nothing pushed through
`makeSyncUI` shows up here. Because the component owns that queue, **unmounting it rejects every item
still pending** with `new Error("react-sync-ui: usePromiseQueue unmounted with pending items")`; otherwise
those promises could never settle. StrictMode's simulated unmount/remount drains nothing, only a real
unmount does. The `makeSyncUI` queue lives in the factory instead, so it survives `<SyncUI />` unmounting.

## API reference

| Export            | Signature                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `makeSyncUI`      | `<InputData, ResolveValue = void>(Component) => (data: InputData) => Promise<ResolveValue>` — promisifies a component on the default queue |
| `SyncUI`          | `() => ReactElement \| null` — renders the head of the default queue; mount once, inside your providers                                    |
| `syncUIFactory`   | `() => { makeSyncUI, SyncUI }` — an independent queue with its own `makeSyncUI` and `SyncUI`                                               |
| `usePromiseQueue` | `<InputData, ResolveValue = void>() => { head?: { data, resolve, reject }; push(data): Promise<ResolveValue> }` — a component-scoped queue |
| `SyncUIProps`     | the props your component gets: `data: InputData`, `resolve: (value: ResolveValue) => void`, `reject: (reason?: unknown) => void`           |
| `SyncUIComponent` | `ComponentType<SyncUIProps<InputData, ResolveValue>>` — the component shape `makeSyncUI` accepts                                           |
| `SyncUIFunction`  | `(input: InputData) => Promise<ResolveValue>` — the awaitable function `makeSyncUI` returns                                                |
| `SyncUIFactory`   | return type of `syncUIFactory()`: `{ makeSyncUI, SyncUI }`                                                                                 |
| `PromiseQueueAPI` | return type of `usePromiseQueue()`; its `head` is a `SyncUIProps<InputData, ResolveValue>`                                                 |

## Compatibility

- **React `^18 || ^19`**, declared as a peer dependency. The queue lives outside React, so nothing is
  queued or settled twice under `<StrictMode>`, and hot-replacing a module that calls `makeSyncUI` (a lazy
  route chunk included) or one that renders `<SyncUI />` keeps the queue and the open dialog.
- **ESM-only** package with an `exports` map and bundled types — Vite, Next.js, Remix and any other modern
  bundler work out of the box, and TypeScript resolves the types under `moduleResolution: "bundler"`,
  `"node16"` and `"nodenext"`. `import "react-sync-ui"` works anywhere; `require("react-sync-ui")` needs
  Node `>=20.19` / `>=22.12`, where `require(esm)` landed — on older Node use a dynamic `import()`.
- **SSR**: `<SyncUI />` renders nothing on the server and hydrates cleanly; pushes before and after
  hydration are both fine, and a push during server rendering only queues the item (no dev warning, no
  timer). Such a promise can only settle in the browser, so drive dialogs from client code: under the
  Next.js app router put `"use client"` at the top of the module that mounts `<SyncUI />`, and define your
  sync components at **module scope**.
- **React 19.2 `<Activity>`**: `<SyncUI />` may sit inside a hidden subtree — going `hidden` → `visible`
  restores the open dialog and the queue keeps draining. A hidden host renders nothing, so the dialog's own
  local state starts over when it comes back; the queue and its promises are untouched.

## FAQ

**Can I load it without a bundler?** Not directly, for the same reason as React itself: the library reads
`process.env.NODE_ENV` at module load to decide whether to log its dev warnings. Any bundler (Vite,
webpack, esbuild, Rollup with a `define`) replaces that read, keeping the warnings in development and
dropping them from production builds. Loading `dist/index.js` straight into a browser with no `process`
global throws `process is not defined`; define `globalThis.process = { env: {} }` first if you need that.

**Why does my dialog open twice in development?** Because your own code pushes from a mount effect, and
`<StrictMode>` runs mount effects twice. That is React, not the queue — push from event handlers.

**How do I test a sync UI?** Await the query rather than the render: click the trigger, then
`await screen.findByRole("button", { name: "Yes" })` and click it. `findByRole` waits for the dialog to
reach the DOM, which removes the need for manual `act` gymnastics around the re-render.

## Migration from 1.x

`2.0.0` rewrites the internals. The API surface is unchanged, but the semantics are stricter:

1. **The React peer dependency is now `^18 || ^19`** (was `>=16`): the queue is exposed to React through
   `useSyncExternalStore`.
2. **The package is ESM-only** with an `exports` map, and the CJS build is gone. If you were deep-importing
   a file from `dist/`, import from `react-sync-ui` instead.
3. **Calling a sync function before `<SyncUI />` is mounted no longer throws**
   `"You have to initialize <SyncUI />"` — the call is queued until a host mounts. Code that relied on that
   throw, or on `<SyncUI />` mounting before the rest of your app, needs updating.
4. **`resolve` / `reject` are bound to their own item and idempotent.** In 1.x they settled whatever was at
   the head of the queue at call time, so a late or duplicate call could settle the _next_ caller's promise.
   Now a second call, or one from an already-closed dialog, is a no-op. Applies to `usePromiseQueue().head`
   too.
5. **`reject()` with no reason now rejects with an `Error`**, not `undefined`:
   `new Error("react-sync-ui: rejected without a reason")`. If you branched on
   `catch (error) { if (error === undefined) ... }`, pass your own reason to `props.reject(reason)` or check
   that message.
6. **`usePromiseQueue` rejects its pending items when the owning component unmounts**, with
   `new Error("react-sync-ui: usePromiseQueue unmounted with pending items")` — previously every
   `await push(...)` stayed suspended forever. The `makeSyncUI` queue is unaffected.
7. **`usePromiseQueue` is exported from the package entry** (it used to be reachable only from
   `react-sync-ui/src/syncUI`).
8. **`reject` is typed `(reason?: unknown) => void`** (was `any`), so a `catch` block has to narrow the
   reason before using it.
9. **`require("react-sync-ui")` needs Node `>=20.19` / `>=22.12`** (unflagged `require(esm)`); on older Node
   use `import` or a dynamic `import()`.

See [CHANGELOG.md](https://github.com/Svehla/react-sync-ui/blob/main/CHANGELOG.md) for the full list,
including the fixes and the new type exports.

## License

[MIT](./LICENSE)
