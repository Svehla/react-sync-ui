# react-sync-ui

[![npm version](https://img.shields.io/npm/v/react-sync-ui.svg)](https://www.npmjs.com/package/react-sync-ui)
[![license](https://img.shields.io/npm/l/react-sync-ui.svg)](./LICENSE)

`react-sync-ui` promisifies your React components and makes your UI awaitable.

## Usage example

```tsx
<button
  onClick={async () => {
    // call a synchronous UI workflow made of promisified React components

    const likeSyncUI = await syncConfirm("Do you like this library?");

    if (likeSyncUI) {
      await syncAlert("Thanks, we like you too");
    } else {
      const isUserSure = await syncConfirm("Are you sure?");
      if (isUserSure) {
        await syncAlert("Try to give it a second try");
      } else {
        await syncAlert("Thanks, we like you too");
      }
    }
  }}
>
  Run
</button>
```

![Decision tree built from awaited dialogs](https://github.com/Svehla/react-sync-ui/blob/main/docs/decision-tree-sync-ui.gif?raw=true)

```tsx
<button
  onClick={async () => {
    const name = await syncPrompt("Fill your name");

    while ((await syncPrompt(`Fill your password!`)) !== "1234") {
      await syncAlert("Invalid password, keep trying");
    }

    await syncAlert(`Congratulation ${name}, you are logged in`);
  }}
>
  Login
</button>
```

![A while-true login loop driven by awaited dialogs](https://github.com/Svehla/react-sync-ui/blob/main/docs/while-true-sync-ui.gif?raw=true)

> `syncAlert`, `syncConfirm` and `syncPrompt` are not shipped by the library — they are **your own**
> components, promisified by `makeSyncUI<InputData, ResolveValue>`, which transforms declarative React
> components into awaitable functions. Their source is in [Recipes](#recipes).

## What is `react-sync-ui` solving?

For a long time, I did not like that React's functional way of declarative UI forced you to write nice UI code, but with ugly distributed business logic.
When you have a complex business use case which is a composition of asynchronous actions like HTTP requests together with user interactions,
your business logic code is distributed over many async React handlers and it's really hard to understand the sequence of business logic.

People very often solve this problem by dependencies in the `useEffect(..., [dependency])` which turns your React logic into an event-driven architecture.
When you change the dependency variable value, the different components will register the dependency change, and `useEffect` will be re-called.
With this event-driven programming style, your code becomes 1000 times more complex, and a newcomer who reads it has no idea what the business workflow is.

A nice solution for this problem is to wrap your declarative React components into Promise wrappers which split your UIs into many
smaller functions that can be simply composed together inside of your Javascript function and you'll get very complex business logic in just a few lines of code.

Thanks to `react-sync-ui` you can simply promisify your React Components UI and make your UI awaitable.

And that's why `react-sync-ui` was created. ❤

PS: I took inspiration from awesome functions: `window.alert`, `window.confirm` and `window.prompt`.

## Installation

```bash
npm i react-sync-ui
```

React `^18 || ^19` is a peer dependency. See [Compatibility](#compatibility) for the packaging details.

## Quick start

### 1. Mount `<SyncUI />` at the root of your project

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

### 2. Create a sync UI

Define a plain React component and hand it to `makeSyncUI`. It returns a **function** — calling that
function renders your component and returns a promise:

- the promise **resolves** when your component calls `props.resolve(value)`
- the promise **rejects** when your component calls `props.reject(reason)`

```ts
const syncAlert = makeSyncUI<InputData, ResolveValue>(YourComponent);
//    ^ (data: InputData) => Promise<ResolveValue>
```

Your component receives exactly three props: `data` (whatever the caller passed in), `resolve` and
`reject`. Any function, event handler or saga can then `await` the returned promise — no context, no
hook and no provider are needed at the call site.

## Where to put `<SyncUI />`

Your promisified components are rendered **inside** `<SyncUI />`, not at the place where you called them,
so `<SyncUI />` has to live inside every context provider those components rely on: theme (`ThemeProvider`,
MUI, Chakra), router (`react-router` — a modal calling `useNavigate` throws otherwise), i18n and stores
(`Provider`, `QueryClientProvider`, `ApolloProvider`). Rule of thumb: mount it **as deep as the deepest
provider it needs**; modals usually render into a portal, so extra depth costs you nothing in CSS stacking.

Mount it **once per factory**. If more than one `<SyncUI />` of the same factory is mounted, only the
first-mounted one renders and a warning is logged in development.

## Recipes

### Alert

```tsx
import { useEffect, useRef } from "react";
import { makeSyncUI } from "react-sync-ui";

export const syncAlert = makeSyncUI<string, void>(props => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} onCancel={() => props.resolve()}>
      <h2>{props.data}</h2>
      <button onClick={() => props.resolve()}>OK</button>
    </dialog>
  );
});
```

### Prompt

```tsx
import { useEffect, useRef, useState } from "react";
import { makeSyncUI } from "react-sync-ui";

export const syncPrompt = makeSyncUI<string, string>(props => {
  const ref = useRef<HTMLDialogElement>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={() => props.reject(new Error("User closed the prompt"))}
    >
      <form
        onSubmit={e => {
          e.preventDefault();
          props.resolve(input);
        }}
      >
        <label>
          {props.data}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
        </label>

        <button type="submit">Accept</button>
      </form>
    </dialog>
  );
});

// usage: this component rejects when the user closes the dialog, so catch it

<button
  onClick={async () => {
    try {
      console.log(await syncPrompt("How are you?"));
    } catch {
      console.log("user cancelled the prompt");
    }
  }}
>
  click me
</button>;
```

### Confirm

```tsx
import { useEffect, useRef } from "react";
import { makeSyncUI } from "react-sync-ui";

type ConfirmData = {
  title: string;
  description?: string;
  okBtn?: string;
  notOkBtn?: string;
};

export const syncRichConfirm = makeSyncUI<ConfirmData, boolean>(props => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} onCancel={() => props.resolve(false)}>
      <h2>{props.data.title}</h2>
      <p>{props.data.description}</p>
      <button autoFocus onClick={() => props.resolve(true)}>
        {props.data.okBtn ?? "Yes"}
      </button>
      <button onClick={() => props.resolve(false)}>
        {props.data.notOkBtn ?? "No"}
      </button>
    </dialog>
  );
});

// a thin positional wrapper for the common call site
export const syncConfirm = (title: string) => syncRichConfirm({ title });
```

## How the queue works

- Every factory owns **one FIFO queue**. `<SyncUI />` renders the head of it — one dialog at a time.
- All sync components of the same factory share that queue, so a `syncAlert` and a `syncConfirm` never
  overlap. Calls that are not awaited simply line up: `await Promise.all([syncAlert("1"), syncAlert("2")])`
  shows two dialogs one after another.
- Every call gets a **fresh React key**, so your component's internal state resets between invocations.
- Calling a sync function **before `<SyncUI />` is mounted is fine** — the item waits in the queue and is
  shown as soon as `<SyncUI />` mounts. If nothing ever mounts, a console error is logged in dev.
- Unmounting `<SyncUI />` does **not** drop the queue: pending items are rendered again on remount and
  their promises stay pending in the meantime.

Need dialogs that run side by side? Use [multiple queues](#advanced-use-case-multiple-async-queues).

## Errors and cancellation

`props.reject(reason)` rejects the awaited promise, which is how you model "the user closed the dialog" —
see the [Prompt recipe](#prompt) for both halves of it.

- If nobody catches a rejected sync UI you get a real unhandled promise rejection — a call you never
  awaited included. Wrap awaits in `try/catch` whenever a component can reject.
- `props.reject()` with **no argument** rejects with
  `new Error("react-sync-ui: rejected without a reason")`, so `catch (error) { error.message }`
  never throws on top of the cancellation. Pass your own `Error` whenever the caller has to tell
  one reason from another.
- `resolve` and `reject` are **bound to their own call**. Calling `resolve` twice, or calling it from a
  dialog that has already been closed (a late HTTP response, a double click), is a **no-op** — it can
  never settle the next caller's promise.
- Rejecting pops the head, so the next queued item is displayed immediately.
- If your component **throws during render**, an internal error boundary rejects that call's promise with
  the thrown error and renders the next queued item. The queue keeps draining and your own error boundary
  is not triggered, so `catch` the call if you want to see what happened.
- `resolve(promise)` pops the item and opens the next dialog **immediately**, while your caller still
  awaits the inner promise. Resolve with a value, not a thenable.
- `usePromiseQueue`: unmounting the component that owns the hook **rejects everything still queued**
  with `new Error("react-sync-ui: usePromiseQueue unmounted with pending items")`. That queue lives in
  the component, so after the unmount nobody could ever settle those promises. Settle them yourself if
  the callers need a more specific reason.

## TypeScript

```ts
type SyncUIComponent<InputData, ResolveValue = void> = ComponentType<
  SyncUIProps<InputData, ResolveValue>
>;

type SyncUIFunction<InputData, ResolveValue = void> = (
  input: InputData
) => Promise<ResolveValue>;

declare function makeSyncUI<InputData, ResolveValue = void>(
  Component: SyncUIComponent<InputData, ResolveValue>
): SyncUIFunction<InputData, ResolveValue>;
```

- `InputData` is the argument of the returned function and the type of `props.data`.
- `ResolveValue` is what `props.resolve` accepts and what the promise resolves with. It defaults to `void`,
  so `makeSyncUI<string>(Comp)` is `(data: string) => Promise<void>` and `props.resolve()` takes no argument.
- For more than one input use an object payload plus a thin positional wrapper, as `syncRichConfirm` /
  `syncConfirm` above do.
- `SyncUIProps` and `SyncUIComponent` are exported too, so you can declare your component separately.
- `SyncUIFunction` names what `makeSyncUI` returns, for wrappers, context values and props types:
  `const withLogging = <D, R>(call: SyncUIFunction<D, R>): SyncUIFunction<D, R> => ...`.
- Every component shape React renders is accepted: inline arrows, function declarations,
  `const Dialog: React.FC<SyncUIProps<string, boolean>> = ...`, `memo()`, `forwardRef()` and classes.

## Advanced use case: multiple async queues

The `makeSyncUI` and `SyncUI` you import from `react-sync-ui` come from one default queue:

```ts
export const { makeSyncUI, SyncUI } = syncUIFactory();
```

Every call to `syncUIFactory()` creates a **completely independent queue** with its own `makeSyncUI` and
its own `SyncUI`. Two queues can therefore show two dialogs at the same time, while calls inside a single
queue still line up one after another. Components created by one factory are only rendered by **that**
factory's `<SyncUI />`, so mount one `<SyncUI />` per factory.

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

// mount one <SyncUI /> per factory
const App = () => (
  <>
    <queueA.SyncUI />
    <queueB.SyncUI />
    <YourAppStuff />
  </>
);

// both dialogs are visible at once; each queue drains independently
await Promise.all([alertA("a-1"), alertB("b-1")]);
```

You can find the full multi-queue example here:
[example/MultiQueuesApp.tsx](https://github.com/Svehla/react-sync-ui/blob/main/example/MultiQueuesApp.tsx)

## `usePromiseQueue`

The low-level hook behind the library, exported for the rare case where you want to own the rendering.
`usePromiseQueue<InputData, ResolveValue>()` returns `{ head?: { data, resolve, reject }, push }`, scoped to the
component that calls it: `push(data)` appends an item and returns a promise, `head` is the first queued
item (`undefined` when empty), and `head.resolve` / `head.reject` settle exactly that item. Each calling
component gets its **own** queue — it is not the default factory's queue — so nothing pushed through
`makeSyncUI` shows up here. For everything else prefer `makeSyncUI`: same machinery, plus a global
`await`-able call site.

Because the queue is owned by that component, **unmounting it rejects every item still pending** with
`new Error("react-sync-ui: usePromiseQueue unmounted with pending items")` — otherwise those promises
could never settle. StrictMode's simulated unmount/remount does not drain anything; only a real unmount
does. `makeSyncUI` behaves differently on purpose: its queue lives in the factory, so it survives
`<SyncUI />` unmounting and is picked up by the next host.

## API reference

| Export            | Signature                                                                                                                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `makeSyncUI`      | `<InputData, ResolveValue = void>(Component) => (data: InputData) => Promise<ResolveValue>` — promisifies a component on the default queue                                                                                                                |
| `SyncUI`          | `() => ReactElement \| null` — renders the head of the default queue; mount once, inside your providers                                                                                                                                                   |
| `syncUIFactory`   | `() => { makeSyncUI, SyncUI }` — an independent queue with its own `makeSyncUI` and `SyncUI`                                                                                                                                                              |
| `usePromiseQueue` | `<InputData, ResolveValue = void>() => { head?: { data, resolve, reject }; push(data): Promise<ResolveValue> }` — a component-scoped queue; unmounting rejects whatever is still pending                                                                  |
| `SyncUIProps`     | `type SyncUIProps<InputData, ResolveValue>` — the props your component receives: `data: InputData`, `resolve: (value: ResolveValue) => void`, `reject: (reason?: unknown) => void`; both settle the caller's promise, close the dialog and are idempotent |
| `SyncUIFunction`  | `type SyncUIFunction<InputData, ResolveValue = void>` — `(input: InputData) => Promise<ResolveValue>`, the awaitable function `makeSyncUI` returns                                                                                                        |
| `PromiseQueueAPI` | `type PromiseQueueAPI<InputData, ResolveValue = void>` — return type of `usePromiseQueue`; `head` is a `SyncUIProps<InputData, ResolveValue>`                                                                                                             |
| `SyncUIComponent` | `type SyncUIComponent<InputData, ResolveValue>` — the component shape `makeSyncUI` accepts: `ComponentType<SyncUIProps<InputData, ResolveValue>>`, so `React.FC`, `memo()`, `forwardRef()` and class components all fit                                   |
| `SyncUIFactory`   | `type SyncUIFactory` — return type of `syncUIFactory()`: `{ makeSyncUI, SyncUI }`                                                                                                                                                                         |

## Compatibility

- **React `^18 || ^19`**, declared as a peer dependency. The queue lives outside React, so nothing is
  queued or settled twice under `<StrictMode>`.
- **ESM-only** package with an `exports` map and bundled TypeScript types — Vite, Next.js, Remix and any
  other modern bundler work out of the box. TypeScript resolves the types through the `exports` map under
  `moduleResolution: "bundler"`, `"node16"` and `"nodenext"`.
- **Node**: `import "react-sync-ui"` works anywhere; `require("react-sync-ui")` only on Node `>=20.19`
  / `>=22.12`, where `require(esm)` landed. On older Node use a dynamic `import()`.
- **Vite / HMR** is safe: hot-replacing a module that calls `makeSyncUI` (including lazily imported route
  chunks) keeps working, and a pending dialog survives a hot-remount of `<SyncUI />`.
- **React 19.2 `<Activity>`**: `<SyncUI />` may sit inside a hidden subtree — going `hidden` → `visible`
  restores the open dialog and the queue keeps draining. A hidden host renders nothing, so the dialog's
  own local state starts over when it comes back; the queue and its promises are untouched.
- **SSR**: `<SyncUI />` renders nothing on the server and hydrates cleanly — pushes before and after
  hydration are both fine. Calling a sync function during server rendering only queues the item: no dev
  warning and no timer when `typeof window === "undefined"`. Such a promise can only settle in the
  browser, so drive dialogs from client code; under the Next.js app router put `"use client"` at the top
  of the module that mounts `<SyncUI />`, and define your sync components at **module scope**.

## Running the example

```bash
cd example && npm install && npm run dev
```

The app in [example/](https://github.com/Svehla/react-sync-ui/tree/main/example) runs against the library
source, so you get HMR while hacking on `src/`.

## FAQ

**Can I mount several `<SyncUI />` of the same factory?** You can, but only the first-mounted one renders
and a dev warning is logged. Use `syncUIFactory()` if you want two independent dialog slots.

**Does it survive hot reload and `<StrictMode>`?** Yes to both — editing a module that calls `makeSyncUI`,
or one that renders `<SyncUI />`, keeps the queue intact, and nothing is queued or settled twice. Note
that _your own_ code pushing from a mount effect still runs twice in development: that is StrictMode, not
the library, so drive dialogs from event handlers.

**What if I call a sync function before `<SyncUI />` is mounted?** The item waits in the queue and is shown
as soon as `<SyncUI />` mounts. If nothing ever mounts you get a dev-only console error.

**Can I load it without a bundler?** Not directly, for the same reason as React itself: the library
reads `process.env.NODE_ENV` at module load to decide whether to log its dev warnings. Any bundler
(Vite, webpack, esbuild, Rollup with a `define`) replaces that read, keeps the warnings in development
and drops them from production builds entirely. Importing `dist/index.js` straight into a browser with
no `process` global throws `process is not defined`; define `globalThis.process = { env: {} }` first if
you really need that.

**How do I test a sync UI?** Await the query rather than the render: click the trigger, then
`await screen.findByRole("button", { name: "Yes" })` and click it. `findByRole` waits for the dialog to
reach the DOM, which removes the need for manual `act` gymnastics around the queue's re-render.

## Migration from 1.x

`2.0.0` rewrites the internals. The API surface is unchanged, but the semantics are stricter:

1. **Peer dependency is now React `^18 || ^19`** (was `>=16`).
2. **The package is ESM-only** with an `exports` map — if you were deep-importing `dist/...`, import from
   `react-sync-ui` instead.
3. **Calling a sync function before `<SyncUI />` is mounted no longer throws**
   `"You have to initialize <SyncUI />"` — the call is queued until `<SyncUI />` mounts. Code that relied
   on that throw, or on `<SyncUI />` mounting before the rest of your app, needs updating.
4. **`resolve` / `reject` are bound to their own call.** In 1.x they settled whatever was at the head of
   the queue at call time, so a late or duplicate call could settle the _next_ caller's promise. Now a
   second call, or a call from an already-closed dialog, is a no-op.
5. **`usePromiseQueue` is a public export**, together with the `SyncUIProps`, `SyncUIComponent`,
   `SyncUIFactory` and `PromiseQueueAPI` types.
6. **`reject` is typed `(reason?: unknown) => void`** (was `any`), so a `catch` block has to narrow the
   reason before using it.
7. **`require("react-sync-ui")` needs Node `>=20.19` / `>=22.12`** (unflagged `require(esm)`); on older
   Node use `import` or a dynamic `import()`.
8. **`reject()` with no reason now rejects with an `Error`**, not `undefined`. If you branched on
   `catch (error) { if (error === undefined) ... }`, switch to your own reason object — pass it to
   `props.reject(reason)` — or check the message
   `"react-sync-ui: rejected without a reason"`.

See [CHANGELOG.md](https://github.com/Svehla/react-sync-ui/blob/main/CHANGELOG.md) for the full list.

## License

[MIT](./LICENSE)
