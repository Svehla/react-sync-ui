/**
 * StrictMode-specific guarantees. The broad scenario matrix already runs
 * under `reactStrictMode: true` (see the `describe.each(modes)` blocks in
 * syncUI.test.tsx and usePromiseQueue.test.tsx); this file pins the things
 * StrictMode's double render / double effect could plausibly break.
 */
import { act, useEffect, useState } from "react";
import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { syncUIFactory, usePromiseQueue } from "../src/syncUI";
import {
  flushMicrotasks,
  makeAlert,
  makePrompt,
  makeSpyAlert,
  track,
  trackUnhandled
} from "./helpers";
import type { Tracked } from "./helpers";

let unhandled: ReturnType<typeof trackUnhandled>;

beforeEach(() => {
  unhandled = trackUnhandled();
});

afterEach(async () => {
  await unhandled.settle();
  expect(unhandled.reasons).toEqual([]);
  vi.restoreAllMocks();
});

const button = (name: string) => screen.getByRole("button", { name });

describe("StrictMode", () => {
  it("M1 sequential awaited dialogs resolve exactly once each, in order", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);
    const onResolved = vi.fn();
    const order: string[] = [];

    const Comp = () => {
      const [done, setDone] = useState(false);
      return (
        <div>
          <factory.SyncUI />
          {done && <h1>done</h1>}
          <button
            onClick={async () => {
              for (const label of ["1", "2", "3"]) {
                await syncAlert(label).then(() => {
                  onResolved(label);
                  order.push(label);
                });
              }
              setDone(true);
            }}
          >
            start
          </button>
        </div>
      );
    };
    render(<Comp />, { reactStrictMode: true });

    await user.click(button("start"));
    for (const label of ["1", "2", "3"]) {
      await user.click(await screen.findByRole("button", { name: label }));
    }

    expect(await screen.findByRole("heading")).toHaveTextContent("done");
    expect(onResolved).toHaveBeenCalledTimes(3);
    expect(order).toEqual(["1", "2", "3"]);
  });

  it("M2 unawaited parallel calls are neither lost nor duplicated", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const spy = makeSpyAlert(factory);
    render(<factory.SyncUI />, { reactStrictMode: true });

    const tracked: Tracked<void>[] = [];
    await act(async () => {
      for (const label of ["a", "b", "c", "d"]) {
        tracked.push(track(spy.call(label)));
      }
    });

    for (const label of ["a", "b", "c", "d"]) {
      expect(screen.getAllByRole("button")).toHaveLength(1);
      await user.click(button(label));
    }
    await flushMicrotasks();

    expect(tracked.map(t => t.state())).toEqual([
      "fulfilled",
      "fulfilled",
      "fulfilled",
      "fulfilled"
    ]);
    for (const label of ["a", "b", "c", "d"]) {
      expect(spy.instanceCount(label)).toBe(1);
    }
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("M3 the host survives StrictMode's mount/unmount/mount effect replay", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);

    const view = render(<factory.SyncUI />, { reactStrictMode: true });
    view.rerender(<factory.SyncUI />);

    let tracked!: Tracked<void>;
    await act(async () => {
      tracked = track(syncAlert("x"));
    });
    expect(screen.getAllByRole("button", { name: "x" })).toHaveLength(1);

    await user.click(button("x"));
    await expect(tracked.promise).resolves.toBeUndefined();

    // the replayed effect must not register the same host twice
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("M4 one click advances the queue by exactly one step", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    let clicks = 0;
    const counting = factory.makeSyncUI<string, number>(props => (
      <button
        onClick={() => {
          clicks++;
          props.resolve(clicks);
        }}
      >
        {props.data}
      </button>
    ));
    render(<factory.SyncUI />, { reactStrictMode: true });

    const tracked: Tracked<number>[] = [];
    await act(async () => {
      for (const label of ["a", "b", "c"]) {
        tracked.push(track(counting(label)));
      }
    });

    await user.click(button("a"));
    await flushMicrotasks();
    expect(clicks).toBe(1);
    expect(tracked.map(t => t.state())).toEqual([
      "fulfilled",
      "pending",
      "pending"
    ]);
    expect(button("b")).toBeInTheDocument();

    await user.click(button("b"));
    await user.click(button("c"));
    await flushMicrotasks();
    expect(tracked.map(t => t.value())).toEqual([1, 2, 3]);
  });

  it("M5 prompt state still resets between items", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const prompt = makePrompt(factory);
    render(<factory.SyncUI />, { reactStrictMode: true });

    let first!: Tracked<string>;
    let second!: Tracked<string>;
    await act(async () => {
      first = track(prompt("first"));
      second = track(prompt("second"));
    });

    await user.type(screen.getByRole("textbox"), "abc");
    await user.click(button("submit"));
    expect(screen.getByLabelText("second")).toHaveValue("");
    await user.click(button("submit"));
    await flushMicrotasks();

    expect(first.value()).toBe("abc");
    expect(second.value()).toBe("");
  });

  it("M6 double resolve does not skip the next item", async () => {
    const factory = syncUIFactory();
    const spy = makeSpyAlert(factory);
    render(<factory.SyncUI />, { reactStrictMode: true });

    let p1!: Tracked<void>;
    let p2!: Tracked<void>;
    await act(async () => {
      p1 = track(spy.call("1"));
      p2 = track(spy.call("2"));
    });

    const bound = spy.handlers.get("1")!;
    await act(async () => {
      bound.resolve();
      bound.resolve();
    });
    await flushMicrotasks();

    expect(p1.state()).toBe("fulfilled");
    expect(p2.state()).toBe("pending");
    expect(button("2")).toBeInTheDocument();
  });

  it("M7 a rejection handled by the caller stays handled (asserted in afterEach)", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const failing = factory.makeSyncUI<string, void>(props => (
      <button onClick={() => props.reject(new Error(props.data))}>
        {props.data}
      </button>
    ));
    render(<factory.SyncUI />, { reactStrictMode: true });

    const onCatch = vi.fn();
    await act(async () => {
      failing("boom").catch(onCatch);
    });
    await user.click(button("boom"));
    await flushMicrotasks();

    expect(onCatch).toHaveBeenCalledTimes(1);
    expect(onCatch.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it("usePromiseQueue: the simulated unmount does not drain pending items", async () => {
    const pushed: Tracked<void>[] = [];
    const Owner = () => {
      const { head, push } = usePromiseQueue<string>();
      // StrictMode replays mount/unmount/mount synchronously, so this push
      // lands between the simulated unmount and the remount: exactly the
      // window in which an eager unmount drain would reject it.
      useEffect(() => {
        pushed.push(track(push("from a mount effect")));
      }, [push]);
      return <span>{head?.data ?? "empty"}</span>;
    };

    render(<Owner />, { reactStrictMode: true });
    await flushMicrotasks();

    expect(pushed.length).toBeGreaterThan(0);
    expect(pushed.map(item => item.state())).toEqual(
      pushed.map(() => "pending")
    );
    expect(screen.getByText("from a mount effect")).toBeInTheDocument();
  });

  it("usePromiseQueue: the hook's store is allocated once per instance", async () => {
    const effects = vi.fn();
    const { result } = renderHook(
      () => {
        const api = usePromiseQueue<string, number>();
        useEffect(() => {
          effects(api.push);
        }, [api.push]);
        return api;
      },
      { reactStrictMode: true }
    );

    let a!: Tracked<number>;
    let b!: Tracked<number>;
    await act(async () => {
      a = track(result.current.push("a"));
      b = track(result.current.push("b"));
    });
    await act(async () => {
      result.current.head?.resolve(1);
    });
    await act(async () => {
      result.current.head?.resolve(2);
    });
    await flushMicrotasks();

    expect(a.value()).toBe(1);
    expect(b.value()).toBe(2);
    expect(result.current.head).toBeUndefined();
    // every effect run saw the same, stable push
    const pushes = new Set(effects.mock.calls.map(call => call[0]));
    expect(pushes.size).toBe(1);
  });
});
