import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import type { ComponentType, ErrorInfo, ReactElement, ReactNode } from "react";

// The library build leaves `process.env.NODE_ENV` untouched on purpose so the
// consumer's bundler decides. The `typeof` guard keeps an unbundled import
// (native browser ESM, esbuild/Rollup with no `define`) from throwing
// `process is not defined` at module scope; the ternary keeps the expression
// foldable, because after a `define` both branches are constants and the
// minifier collapses the whole thing to `false`, taking the dev warnings with
// it. The shorter `typeof process !== "undefined" && ...` form does NOT fold:
// `typeof process < "u" && !1` survives, and so do the warning strings.
declare const process: { env: { NODE_ENV?: string } };
const isDev =
  typeof process === "undefined"
    ? false
    : process.env.NODE_ENV !== "production";

// ------------------------------------------------------------------------------------
// public types

export type SyncUIProps<InputData, ResolveValue = void> = {
  data: InputData;
  resolve: (value: ResolveValue) => void;
  reject: (reason?: unknown) => void;
};

// ComponentType, not a bare function type: React 19's FC returns
// `ReactNode | Promise<ReactNode>`, so `React.FC<SyncUIProps<...>>`, memo(),
// forwardRef() and class components all have to be accepted here.
export type SyncUIComponent<InputData, ResolveValue = void> = ComponentType<
  SyncUIProps<InputData, ResolveValue>
>;

// The awaitable function `makeSyncUI` returns. Named, so a wrapper, a context
// value or a props type can refer to it instead of re-spelling the signature.
export type SyncUIFunction<InputData, ResolveValue = void> = (
  input: InputData
) => Promise<ResolveValue>;

// `head` is exactly what a sync component receives, so it reuses SyncUIProps.
export type PromiseQueueAPI<InputData, ResolveValue = void> = {
  head?: SyncUIProps<InputData, ResolveValue>;
  push: (data: InputData) => Promise<ResolveValue>;
};

export type SyncUIFactory = {
  makeSyncUI: <InputData, ResolveValue = void>(
    Component: SyncUIComponent<InputData, ResolveValue>
  ) => SyncUIFunction<InputData, ResolveValue>;
  SyncUI: () => ReactElement | null;
};

// ------------------------------------------------------------------------------------
// queue store

type Listener = () => void;

type Entry<Data, ResolveValue> = {
  readonly id: number;
  readonly type: symbol;
  readonly data: Data;
  readonly resolve: (value: ResolveValue) => void;
  readonly reject: (reason?: unknown) => void;
};

// Monotonic, so React keys are unique per queued item (no Math.random()).
let entrySeq = 0;

const defaultRejectReason = () =>
  new Error("react-sync-ui: rejected without a reason");

/**
 * The queue lives OUTSIDE React. Every mutation happens in an event handler, an
 * async continuation or a commit-phase lifecycle (the error boundary's
 * `componentDidCatch`), never during render and never inside a setState
 * updater, so StrictMode's double render / double updater passes and HMR
 * remounts can neither duplicate nor lose a promise settlement. The
 * commit-phase case is safe because a mutation only schedules a rerender
 * through the subscription; it never runs while React is rendering.
 */
const createQueueStore = <Data, ResolveValue>() => {
  let queue: readonly Entry<Data, ResolveValue>[] = [];
  const listeners = new Set<Listener>();

  const emit = () => {
    listeners.forEach(listener => listener());
  };

  // Stable identity, so React never re-subscribes.
  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  // useSyncExternalStore needs a cached snapshot: `queue` is only ever
  // replaced, never mutated, so the head entry keeps its identity until it
  // actually leaves the queue.
  const getHead = (): Entry<Data, ResolveValue> | null => queue[0] ?? null;

  const push = (type: symbol, data: Data) =>
    new Promise<ResolveValue>((resolve, reject) => {
      // The Promise executor runs synchronously, so the entry is queued
      // before push() returns.
      queue = [...queue, { id: ++entrySeq, type, data, resolve, reject }];
      emit();
    });

  // Settles exactly once. Membership in the queue is the "not yet settled"
  // flag, so a second call, or a call from a stale closure, is a no-op.
  const settle = (
    entry: Entry<Data, ResolveValue>,
    run: (entry: Entry<Data, ResolveValue>) => void
  ) => {
    const next = queue.filter(item => item !== entry);
    if (next.length === queue.length) return;
    queue = next;
    emit();
    run(entry);
  };

  // Rejects everything still queued at once (used when the owner of the queue
  // goes away), so no caller is left awaiting a promise nobody can settle.
  const drain = (reason: unknown) => {
    if (queue.length === 0) return;
    const abandoned = queue;
    queue = [];
    emit();
    abandoned.forEach(item => item.reject(reason));
  };

  return {
    subscribe,
    emit,
    getHead,
    push,
    drain,
    size: () => queue.length,
    resolveEntry: (entry: Entry<Data, ResolveValue>, value: ResolveValue) =>
      settle(entry, item => item.resolve(value)),
    // `reject()` with no reason would reject with `undefined`, so the
    // idiomatic `catch (error) { toast(error.message) }` would throw on top of
    // the cancellation. One default, applied for every caller.
    rejectEntry: (entry: Entry<Data, ResolveValue>, reason?: unknown) =>
      settle(entry, item => item.reject(reason ?? defaultRejectReason()))
  };
};

const getNullSnapshot = () => null;

// ------------------------------------------------------------------------------------
// usePromiseQueue

const defaultQueueType = Symbol("usePromiseQueue");

export const usePromiseQueue = <
  InputData,
  ResolveValue = void
>(): PromiseQueueAPI<InputData, ResolveValue> => {
  // Lazy initializer: StrictMode may run it twice, but it only allocates.
  const [store] = useState(() => createQueueStore<InputData, ResolveValue>());
  const head = useSyncExternalStore(
    store.subscribe,
    store.getHead,
    getNullSnapshot
  );
  const push = useCallback(
    (data: InputData) => store.push(defaultQueueType, data),
    [store]
  );

  // Unlike the factory queue (which outlives every host), this store is owned
  // by the component, so anything still queued when it unmounts could never be
  // settled by anyone: every `await push(...)` would stay suspended forever.
  // The drain is deferred to a microtask and cancelled if the effect runs
  // again, because StrictMode (and Fast Refresh) replay mount/unmount/mount
  // synchronously: draining on that simulated unmount would reject items a
  // sibling had just pushed from its own mount effect.
  const drainPending = useRef(false);
  useEffect(() => {
    drainPending.current = false;
    return () => {
      drainPending.current = true;
      queueMicrotask(() => {
        if (!drainPending.current) return;
        drainPending.current = false;
        store.drain(
          new Error(
            "react-sync-ui: usePromiseQueue unmounted with pending items"
          )
        );
      });
    };
  }, [store]);

  return useMemo(
    () => ({
      head: head
        ? {
            data: head.data,
            // Bound to THIS entry: stale or repeated calls are no-ops.
            resolve: (value: ResolveValue) => store.resolveEntry(head, value),
            reject: (reason?: unknown) => store.rejectEntry(head, reason)
          }
        : undefined,
      push
    }),
    [head, push, store]
  );
};

// ------------------------------------------------------------------------------------
// syncUIFactory

// The registry has to accept components of every Data/Result shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySyncUIComponent = SyncUIComponent<any, any>;

// A dialog that throws during render used to be a poison pill: the app's own
// error boundary caught it, <SyncUI /> unmounted, and the entry stayed at the
// head of the queue forever, hanging its own promise and every queued one.
// This boundary keeps the failure local: the entry is rejected (the caller's
// `await` throws, which is the error channel) and the queue moves on. It is
// remounted per entry via `key`, so the next dialog renders fresh.
type SyncUIBoundaryProps<Data, ResolveValue> = {
  entry: Entry<Data, ResolveValue>;
  onError: (entry: Entry<Data, ResolveValue>, error: unknown) => void;
  children: ReactNode;
};

type SyncUIBoundaryState = { failed: boolean };

class SyncUIErrorBoundary extends Component<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SyncUIBoundaryProps<any, any>,
  SyncUIBoundaryState
> {
  state: SyncUIBoundaryState = { failed: false };

  static getDerivedStateFromError(): SyncUIBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    // Not re-thrown on purpose: the promise rejection is the error channel,
    // and React already logs the caught error itself in development.
    this.props.onError(this.props.entry, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const syncUIFactory = (): SyncUIFactory => {
  const store = createQueueStore<unknown, unknown>();

  // Live registry, resolved at render time. A module that calls makeSyncUI
  // after <SyncUI /> has mounted (lazy chunk, Vite HMR) simply lands here.
  const components = new Map<symbol, AnySyncUIComponent>();

  // Every mounted <SyncUI /> instance, in mount order. A Set instead of a
  // boolean or a single ref: a replacement instance can mount before the old
  // one's cleanup runs (Fast Refresh remounts, a second root, route layouts),
  // and that overlap must not break anything.
  const hosts = new Set<object>();
  const primaryHost = () => hosts.values().next().value;

  let hostEverMounted = false;
  let warnedNoHost = false;
  let warnedMultipleHosts = false;
  let noHostTimer: ReturnType<typeof setTimeout> | undefined;

  // Pushing before <SyncUI /> is mounted is a race, not a configuration error
  // (child effects run before parent effects), so items just wait in the
  // queue. A silent hang would hide a forgotten <SyncUI />, hence the dev
  // warning if nothing has mounted after a while.
  const scheduleNoHostWarning = () => {
    if (!isDev || hostEverMounted || warnedNoHost || noHostTimer) return;
    // On the server <SyncUI /> never mounts, so the warning would be noise
    // and the timer would keep the process alive.
    if (typeof window === "undefined") return;
    noHostTimer = setTimeout(() => {
      noHostTimer = undefined;
      if (hostEverMounted || store.size() === 0) return;
      warnedNoHost = true;
      console.error(
        "[react-sync-ui] a sync UI has been pending for 3s and no <SyncUI /> " +
          "is mounted. Render <SyncUI /> once, near the root of your app."
      );
    }, 3000);
  };

  const makeSyncUI = <InputData, ResolveValue = void>(
    Component: SyncUIComponent<InputData, ResolveValue>
  ): SyncUIFunction<InputData, ResolveValue> => {
    const type = Symbol(
      (Component as { displayName?: string }).displayName ||
        Component.name ||
        "SyncUI"
    );
    components.set(type, Component as AnySyncUIComponent);

    return (input: InputData): Promise<ResolveValue> => {
      scheduleNoHostWarning();
      return store.push(type, input) as Promise<ResolveValue>;
    };
  };

  const SyncUI = (): ReactElement | null => {
    // Stable per-instance identity.
    const [token] = useState(() => ({}));
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    // Only the first mounted host renders; the others stay empty so a dialog
    // is never shown twice. Declared BEFORE the registration effect so React
    // is subscribed by the time that effect emits.
    const getSnapshot = useCallback(
      () => (primaryHost() === token ? store.getHead() : null),
      [token]
    );
    const head = useSyncExternalStore(
      store.subscribe,
      getSnapshot,
      getNullSnapshot
    );

    useEffect(() => {
      hosts.add(token);
      hostEverMounted = true;
      // A host is here: the "nothing ever mounted" warning can no longer fire,
      // so the handle should not linger (it would hold a Node test run open).
      if (noHostTimer !== undefined) {
        clearTimeout(noHostTimer);
        noHostTimer = undefined;
      }
      store.emit();
      // React 19 <Activity mode="hidden"> disconnects the store subscription
      // and re-shows with a stale cached snapshot, so emit() alone compares
      // equal and skips the render. A local state bump cannot be skipped.
      // Only worth it when there is something to re-read: mounting with an
      // empty queue is the common case and should not cost an extra render.
      if (store.getHead()) rerender();

      // Deferred one tick and cleared on cleanup, so the HMR overlap (new
      // instance mounted, old one not yet unmounted) never false-warns.
      let warnTimer: ReturnType<typeof setTimeout> | undefined;
      if (isDev) {
        warnTimer = setTimeout(() => {
          if (hosts.size > 1 && !warnedMultipleHosts) {
            warnedMultipleHosts = true;
            console.warn(
              "[react-sync-ui] more than one <SyncUI /> of the same factory " +
                "is mounted; only the first mounted one renders."
            );
          }
        }, 0);
      }

      return () => {
        if (warnTimer !== undefined) clearTimeout(warnTimer);
        hosts.delete(token);
        // The queue stays intact; hand over to the next host, if any.
        store.emit();
      };
    }, [token]);

    const Dialog = head ? components.get(head.type) : undefined;

    // An entry whose component is missing can never be rendered, so "log and
    // stall" would block it AND everything queued behind it forever; reject it
    // instead and let the queue move on. Kept out of render so StrictMode
    // cannot run it twice. Not reachable through the public API, because
    // makeSyncUI registers the component in the same statement that mints its
    // symbol; this is the recovery path for a registry that lost the entry (a
    // module graph reset under a live queue).
    useEffect(() => {
      if (!head || components.get(head.type)) return;
      if (isDev) {
        console.error(
          "[react-sync-ui] no component registered for the queued item",
          head.type
        );
      }
      store.rejectEntry(
        head,
        new Error("react-sync-ui: no component registered for this sync UI")
      );
    }, [head]);

    const handlers = useMemo(
      () =>
        head
          ? {
              resolve: (value: unknown) => store.resolveEntry(head, value),
              reject: (reason?: unknown) => store.rejectEntry(head, reason)
            }
          : null,
      [head]
    );

    if (!head || !handlers || !Dialog) return null;

    // The key changes per queued item, so two consecutive items of the same
    // component get a fresh instance (no leaked local state) and a boundary
    // that caught an error is reset for the next one.
    // `Dialog` is a registry lookup, not a component created during render;
    // the lint rule cannot tell the difference.
    return (
      <SyncUIErrorBoundary
        key={head.id}
        entry={head}
        onError={(entry, error) => store.rejectEntry(entry, error)}
      >
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Dialog
          data={head.data}
          resolve={handlers.resolve}
          reject={handlers.reject}
        />
      </SyncUIErrorBoundary>
    );
  };

  return { makeSyncUI, SyncUI };
};
