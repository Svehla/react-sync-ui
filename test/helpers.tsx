import { act, useEffect, useState } from "react";
import { onTestFinished } from "vitest";
import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import type { SyncUIFactory, SyncUIProps } from "../src/syncUI";

// ------------------------------------------------------------------------------------
// promise state

export type PromiseState = "pending" | "fulfilled" | "rejected";

export type Tracked<T> = {
  promise: Promise<T>;
  state: () => PromiseState;
  value: () => T | undefined;
  reason: () => unknown;
};

/**
 * Observes a promise without racing it. Handlers are attached synchronously,
 * so a tracked promise never shows up as an unhandled rejection either.
 */
export const track = <T,>(promise: Promise<T>): Tracked<T> => {
  let state: PromiseState = "pending";
  let value: T | undefined;
  let reason: unknown;
  promise.then(
    v => {
      state = "fulfilled";
      value = v;
    },
    e => {
      state = "rejected";
      reason = e;
    }
  );
  return {
    promise,
    state: () => state,
    value: () => value,
    reason: () => reason
  };
};

/** Lets queued microtasks run, inside act() so React updates are flushed. */
export const flushMicrotasks = () =>
  act(async () => {
    await Promise.resolve();
  });

export const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

/** A real-timer wait wrapped in act(), for continuations that resolve later. */
export const actDelay = (ms: number) =>
  act(async () => {
    await delay(ms);
  });

// ------------------------------------------------------------------------------------
// StrictMode matrix

export type Mode = { name: string; strict: boolean };

export const modes: readonly Mode[] = [
  { name: "normal", strict: false },
  { name: "strict", strict: true }
];

export const renderWithStrict = (
  ui: ReactElement,
  strict: boolean,
  options: Omit<RenderOptions, "reactStrictMode"> = {}
) => render(ui, { ...options, reactStrictMode: strict });

// ------------------------------------------------------------------------------------
// unhandled rejections

type NodeProcessLike = {
  on: (
    event: "unhandledRejection",
    listener: (reason: unknown) => void
  ) => void;
  off: (
    event: "unhandledRejection",
    listener: (reason: unknown) => void
  ) => void;
};

/**
 * Records every unhandled rejection Node reports while active. Vitest fails
 * the run on those anyway; this makes the assertion local and explicit.
 */
export const trackUnhandled = () => {
  const reasons: unknown[] = [];
  const listener = (reason: unknown) => {
    reasons.push(reason);
  };
  const nodeProcess = (globalThis as unknown as { process: NodeProcessLike })
    .process;
  nodeProcess.on("unhandledRejection", listener);
  const off = () => {
    nodeProcess.off("unhandledRejection", listener);
  };
  // Unconditional: an assertion that throws before settle() is reached must
  // not leave the listener attached for the rest of the file.
  onTestFinished(off);
  return {
    reasons,
    /** Gives Node a macrotask turn to emit the event, then detaches. */
    settle: async () => {
      await delay(10);
      off();
    }
  };
};

// ------------------------------------------------------------------------------------
// sync UI factories used across the suites

/** A single button showing `data`; clicking it resolves with undefined. */
export const makeAlert = (factory: SyncUIFactory) =>
  factory.makeSyncUI<string, void>(function Alert(props) {
    return <button onClick={() => props.resolve()}>{props.data}</button>;
  });

/** A confirm: "yes" resolves true, "no" resolves false, "cancel" rejects. */
export const makeConfirm = (factory: SyncUIFactory) =>
  factory.makeSyncUI<string, boolean>(function Confirm(props) {
    return (
      <div role="dialog" aria-label={props.data}>
        <button onClick={() => props.resolve(true)}>yes</button>
        <button onClick={() => props.resolve(false)}>no</button>
        <button onClick={() => props.reject(new Error("cancelled"))}>
          cancel
        </button>
      </div>
    );
  });

/** A controlled input plus submit button; resolves with the typed text. */
export const makePrompt = (factory: SyncUIFactory) =>
  factory.makeSyncUI<string, string>(function Prompt(props) {
    const [value, setValue] = useState("");
    return (
      <form
        onSubmit={event => {
          event.preventDefault();
          props.resolve(value);
        }}
      >
        <label>
          {props.data}
          <input
            value={value}
            onChange={event => setValue(event.target.value)}
          />
        </label>
        <button type="submit">submit</button>
      </form>
    );
  });

/**
 * An alert that also hands its bound `resolve`/`reject` to the test (from an
 * effect, never during render) and records the distinct component instances
 * seen per `data`. Distinct instances, not effect runs, so the count is the
 * same with and without StrictMode's effect replay.
 */
export const makeSpyAlert = (factory: SyncUIFactory) => {
  const handlers = new Map<
    string,
    Pick<SyncUIProps<string>, "resolve" | "reject">
  >();
  const instances = new Map<string, Set<object>>();
  const call = factory.makeSyncUI<string, void>(function SpyAlert(props) {
    const [instance] = useState(() => ({}));
    useEffect(() => {
      handlers.set(props.data, {
        resolve: props.resolve,
        reject: props.reject
      });
      const seen = instances.get(props.data) ?? new Set<object>();
      seen.add(instance);
      instances.set(props.data, seen);
    }, [instance, props.data, props.resolve, props.reject]);
    return <button onClick={() => props.resolve()}>{props.data}</button>;
  });
  const instanceCount = (data: string) => instances.get(data)?.size ?? 0;
  return { call, handlers, instanceCount };
};
