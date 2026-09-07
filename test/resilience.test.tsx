import * as React from "react";
import { Component, act, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { syncUIFactory } from "../src/syncUI";
import {
  flushMicrotasks,
  makeAlert,
  makeSpyAlert,
  modes,
  renderWithStrict,
  track
} from "./helpers";
import type { Tracked } from "./helpers";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const button = (name: string) => screen.getByRole("button", { name });
const findButton = (name: string) => screen.findByRole("button", { name });
const queryButton = (name: string) => screen.queryByRole("button", { name });

// ------------------------------------------------------------------------------------
// <Activity> hide/show (React 19.2+). The CI matrix also runs on React 18,
// which has no Activity export, so the whole block is skipped there.

const hasActivity = "Activity" in React;
// Resolved lazily so the module still evaluates on React 18.
const Activity = (
  React as {
    Activity?: React.ComponentType<{
      mode: "visible" | "hidden";
      children?: ReactNode;
    }>;
  }
).Activity!;

describe.skipIf(!hasActivity).each(modes)(
  "R1 <Activity> around <SyncUI /> ($name)",
  ({ strict }) => {
    it("hide/show with a pending dialog brings the dialog back and drains the queue", async () => {
      const user = userEvent.setup();
      const factory = syncUIFactory();
      const syncAlert = makeAlert(factory);

      const App = () => {
        const [mode, setMode] = useState<"visible" | "hidden">("visible");
        return (
          <div>
            <button
              onClick={() => setMode(mode === "visible" ? "hidden" : "visible")}
            >
              toggle
            </button>
            <Activity mode={mode}>
              <factory.SyncUI />
            </Activity>
          </div>
        );
      };

      renderWithStrict(<App />, strict);

      let first: Tracked<void>;
      let second: Tracked<void>;
      await act(async () => {
        first = track(syncAlert("one"));
        second = track(syncAlert("two"));
      });
      expect(await findButton("one")).toBeInTheDocument();

      // hidden: React disconnects the store subscription and prerenders the
      // subtree, so the dialog goes away
      await user.click(button("toggle"));
      expect(queryButton("one")).not.toBeInTheDocument();

      // visible again: the host must re-read the store, not trust the snapshot
      // useSyncExternalStore cached before the subtree was hidden
      await user.click(button("toggle"));
      expect(await findButton("one")).toBeInTheDocument();

      await user.click(button("one"));
      await flushMicrotasks();
      expect(first!.state()).toBe("fulfilled");

      // and the queue keeps moving
      await user.click(await findButton("two"));
      await flushMicrotasks();
      expect(second!.state()).toBe("fulfilled");
      expect(queryButton("two")).not.toBeInTheDocument();
    });
  }
);

// ------------------------------------------------------------------------------------
// a dialog that throws during render

/** Records what an app-level boundary catches, and renders a fallback. */
class AppBoundary extends Component<
  { onError: (error: unknown) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, _info: ErrorInfo) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? <p>app boundary</p> : this.props.children;
  }
}

describe.each(modes)("R2 a throwing dialog ($name)", ({ strict }) => {
  const makeBoom = (factory: ReturnType<typeof syncUIFactory>, error: Error) =>
    factory.makeSyncUI<string, void>(function Boom(): never {
      throw error;
    });

  it("rejects its own promise with the thrown error and lets the queue move on", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const failure = new Error("boom");
    const boom = makeBoom(factory, failure);
    const syncAlert = makeAlert(factory);

    renderWithStrict(
      <div>
        <h1>app</h1>
        <factory.SyncUI />
      </div>,
      strict
    );

    let thrown: Tracked<void>;
    let next: Tracked<void>;
    await act(async () => {
      thrown = track(boom("explodes"));
      next = track(syncAlert("second"));
    });
    await flushMicrotasks();

    // the caller gets the very error the component threw
    expect(thrown!.state()).toBe("rejected");
    expect(thrown!.reason()).toBe(failure);

    // the host survived and the next queued dialog renders and settles
    expect(screen.getByRole("heading")).toHaveTextContent("app");
    await user.click(await findButton("second"));
    await flushMicrotasks();
    expect(next!.state()).toBe("fulfilled");
    expect(queryButton("second")).not.toBeInTheDocument();

    // React logs the caught error itself; the library adds nothing on top
    expect(
      consoleError.mock.calls.filter(call =>
        String(call[0]).includes("[react-sync-ui]")
      )
    ).toEqual([]);
    // React logs a caught error exactly once per boundary catch (1 observed
    // here, in both modes); the bound leaves room for a retried render.
    expect(consoleError.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("does not reach an app-level error boundary above <SyncUI />", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const failure = new Error("boom");
    const boom = makeBoom(factory, failure);
    const spy = makeSpyAlert(factory);
    const onError = vi.fn();

    renderWithStrict(
      <AppBoundary onError={onError}>
        <h1>app</h1>
        <factory.SyncUI />
      </AppBoundary>,
      strict
    );

    let thrown: Tracked<void>;
    let next: Tracked<void>;
    await act(async () => {
      thrown = track(boom("explodes"));
      next = track(spy.call("second"));
    });
    await flushMicrotasks();

    expect(onError).not.toHaveBeenCalled();
    expect(screen.queryByText("app boundary")).not.toBeInTheDocument();
    expect(thrown!.reason()).toBe(failure);

    // the next dialog is a fresh instance, not one leaked from the thrower
    expect(spy.instanceCount("second")).toBe(1);
    await user.click(await findButton("second"));
    await flushMicrotasks();
    expect(next!.state()).toBe("fulfilled");
    // React logs a caught error exactly once per boundary catch (1 observed
    // here, in both modes); the bound leaves room for a retried render.
    expect(consoleError.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("two throwers in a row each reject, and a healthy dialog still follows", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const first = new Error("boom 1");
    const second = new Error("boom 2");
    const boom1 = makeBoom(factory, first);
    const boom2 = makeBoom(factory, second);
    const syncAlert = makeAlert(factory);

    renderWithStrict(<factory.SyncUI />, strict);

    let a: Tracked<void>;
    let b: Tracked<void>;
    let c: Tracked<void>;
    await act(async () => {
      a = track(boom1("one"));
      b = track(boom2("two"));
      c = track(syncAlert("three"));
    });
    await flushMicrotasks();

    expect([a!.state(), b!.state()]).toEqual(["rejected", "rejected"]);
    expect([a!.reason(), b!.reason()]).toEqual([first, second]);

    await user.click(await findButton("three"));
    await flushMicrotasks();
    expect(c!.state()).toBe("fulfilled");
    // 2 observed: one React log per thrown error.
    expect(consoleError.mock.calls.length).toBeLessThanOrEqual(4);
  });
});

// ------------------------------------------------------------------------------------
// no browser (SSR / Node)

describe("R3 server rendering", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  it("schedules no no-host warning timer when there is no window", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);

    // `typeof window` is "undefined" for a global that exists but holds
    // undefined, so this is the jsdom-safe way to look like Node.
    vi.stubGlobal("window", undefined);
    try {
      expect(typeof window).toBe("undefined");
      const pending = track(syncAlert("server"));
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(10_000);
      expect(pending.state()).toBe("pending");
    } finally {
      vi.unstubAllGlobals();
    }

    expect(consoleError).not.toHaveBeenCalled();
    expect(typeof window).toBe("object");
  });

  it("still schedules the warning in the browser (control)", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);

    track(syncAlert("browser"));
    expect(vi.getTimerCount()).toBe(1);
  });
});
