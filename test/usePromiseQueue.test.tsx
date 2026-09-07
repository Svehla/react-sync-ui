import { act } from "react";
import { renderHook } from "@testing-library/react";
import { usePromiseQueue } from "../src/syncUI";
import { flushMicrotasks, modes, track, trackUnhandled } from "./helpers";
import type { Tracked } from "./helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(modes)("usePromiseQueue ($name)", ({ strict }) => {
  const setup = <Data, ResolveValue = void>() =>
    renderHook(() => usePromiseQueue<Data, ResolveValue>(), {
      reactStrictMode: strict
    });

  it("Q1 starts empty: head is undefined and push is a function", () => {
    const { result } = setup<string, number>();

    expect(result.current.head).toBeUndefined();
    expect(typeof result.current.push).toBe("function");
  });

  it("Q2/Q3 keeps FIFO order, even for pushes batched in one act()", async () => {
    const { result } = setup<string>();
    const tracked: Tracked<void>[] = [];

    await act(async () => {
      tracked.push(track(result.current.push("a")));
      tracked.push(track(result.current.push("b")));
      tracked.push(track(result.current.push("c")));
    });

    const seen: string[] = [];
    while (result.current.head) {
      seen.push(result.current.head.data);
      const { head } = result.current;
      act(() => {
        head.resolve();
      });
    }
    await flushMicrotasks();

    expect(seen).toEqual(["a", "b", "c"]);
    expect(result.current.head).toBeUndefined();
    expect(tracked.map(t => t.state())).toEqual([
      "fulfilled",
      "fulfilled",
      "fulfilled"
    ]);
  });

  it("head exposes { data, resolve, reject } for the first item only", async () => {
    const { result } = setup<string, number>();

    await act(async () => {
      track(result.current.push("first"));
      track(result.current.push("second"));
    });

    expect(result.current.head).toEqual({
      data: "first",
      resolve: expect.any(Function),
      reject: expect.any(Function)
    });
  });

  it("Q4 push() stays pending until head.resolve(value) settles it", async () => {
    const { result } = setup<string, number>();
    let tracked!: Tracked<number>;

    await act(async () => {
      tracked = track(result.current.push("a"));
    });
    await flushMicrotasks();
    expect(tracked.state()).toBe("pending");

    await act(async () => {
      result.current.head?.resolve(42);
    });
    await flushMicrotasks();

    expect(tracked.state()).toBe("fulfilled");
    expect(tracked.value()).toBe(42);
    expect(result.current.head).toBeUndefined();
  });

  it("Q5 head.reject(reason) rejects push() with the same object", async () => {
    const { result } = setup<string, number>();
    const error = new Error("nope");
    let tracked!: Tracked<number>;

    await act(async () => {
      tracked = track(result.current.push("a"));
    });
    await act(async () => {
      result.current.head?.reject(error);
    });
    await flushMicrotasks();

    expect(tracked.state()).toBe("rejected");
    expect(tracked.reason()).toBe(error);
    await expect(tracked.promise).rejects.toBe(error);
  });

  it("Q6 head.data is the pushed object itself, not a copy", async () => {
    const { result } = setup<{ a: number }>();
    const data = { a: 1 };

    await act(async () => {
      track(result.current.push(data));
    });

    expect(result.current.head?.data).toBe(data);
  });

  it("Q7 the same object pushed twice is two independent items", async () => {
    const { result } = setup<{ a: number }, string>();
    const data = { a: 1 };
    let p1!: Tracked<string>;
    let p2!: Tracked<string>;

    await act(async () => {
      p1 = track(result.current.push(data));
      p2 = track(result.current.push(data));
    });
    expect(p1.promise).not.toBe(p2.promise);

    await act(async () => {
      result.current.head?.resolve("one");
    });
    await flushMicrotasks();
    expect(p1.state()).toBe("fulfilled");
    expect(p1.value()).toBe("one");
    expect(p2.state()).toBe("pending");
    expect(result.current.head?.data).toBe(data);

    await act(async () => {
      result.current.head?.resolve("two");
    });
    await flushMicrotasks();
    expect(p2.value()).toBe("two");
    expect(result.current.head).toBeUndefined();
  });

  it("head and push keep their identity across unrelated re-renders", async () => {
    const { result, rerender } = setup<string>();

    await act(async () => {
      track(result.current.push("a"));
    });
    const { head, push } = result.current;

    rerender();

    expect(result.current.head).toBe(head);
    expect(result.current.push).toBe(push);
  });

  it("resolving the head and pushing in the same act() is consistent", async () => {
    const { result } = setup<string>();

    await act(async () => {
      track(result.current.push("a"));
      track(result.current.push("b"));
    });
    await act(async () => {
      result.current.head?.resolve();
      track(result.current.push("c"));
    });

    expect(result.current.head?.data).toBe("b");
    await act(async () => {
      result.current.head?.resolve();
    });
    expect(result.current.head?.data).toBe("c");
  });

  it("Q8 a resolve captured before the queue drained is a no-op afterwards", async () => {
    const { result } = setup<string, number>();

    await act(async () => {
      track(result.current.push("a"));
    });
    const captured = result.current.head!;

    await act(async () => {
      captured.resolve(1);
    });
    expect(result.current.head).toBeUndefined();

    expect(() => {
      act(() => {
        captured.resolve(2);
        captured.reject(new Error("late"));
      });
    }).not.toThrow();
    expect(result.current.head).toBeUndefined();
  });

  it("Q9 a stale resolve from a previous head does not touch the current head", async () => {
    const { result } = setup<string, number>();
    let pB!: Tracked<number>;

    await act(async () => {
      track(result.current.push("a"));
      pB = track(result.current.push("b"));
    });
    const staleA = result.current.head!;

    await act(async () => {
      staleA.resolve(1);
    });
    expect(result.current.head?.data).toBe("b");

    await act(async () => {
      staleA.resolve(99);
    });
    await flushMicrotasks();

    expect(result.current.head?.data).toBe("b");
    expect(pB.state()).toBe("pending");
  });

  it("Q10 double resolve of one head settles it once and keeps the next item", async () => {
    const { result } = setup<string, number>();
    let pA!: Tracked<number>;
    let pB!: Tracked<number>;

    await act(async () => {
      pA = track(result.current.push("a"));
      pB = track(result.current.push("b"));
    });

    await act(async () => {
      const { head } = result.current;
      head?.resolve(1);
      head?.resolve(2);
    });
    await flushMicrotasks();

    expect(pA.state()).toBe("fulfilled");
    expect(pA.value()).toBe(1);
    expect(pB.state()).toBe("pending");
    expect(result.current.head?.data).toBe("b");
  });

  it("Q11 double reject of one head is symmetrical", async () => {
    const { result } = setup<string, number>();
    const first = new Error("first");
    let pA!: Tracked<number>;
    let pB!: Tracked<number>;

    await act(async () => {
      pA = track(result.current.push("a"));
      pB = track(result.current.push("b"));
    });

    await act(async () => {
      const { head } = result.current;
      head?.reject(first);
      head?.reject(new Error("second"));
    });
    await flushMicrotasks();

    expect(pA.state()).toBe("rejected");
    expect(pA.reason()).toBe(first);
    expect(pB.state()).toBe("pending");
    expect(result.current.head?.data).toBe("b");
  });

  it("Q12 reject followed by resolve on the same item keeps the rejection", async () => {
    const { result } = setup<string, number>();
    const error = new Error("rejected first");
    let pA!: Tracked<number>;
    let pB!: Tracked<number>;

    await act(async () => {
      pA = track(result.current.push("a"));
      pB = track(result.current.push("b"));
    });

    await act(async () => {
      const { head } = result.current;
      head?.reject(error);
      head?.resolve(1);
    });
    await flushMicrotasks();

    expect(pA.state()).toBe("rejected");
    expect(pA.reason()).toBe(error);
    expect(pB.state()).toBe("pending");
    expect(result.current.head?.data).toBe("b");
  });

  it("Q13 a rejection the caller handles is never reported as unhandled", async () => {
    const unhandled = trackUnhandled();
    const { result } = setup<string>();
    const onCatch = vi.fn();

    await act(async () => {
      result.current.push("a").catch(onCatch);
    });
    await act(async () => {
      result.current.head?.reject(new Error("handled"));
    });
    await flushMicrotasks();
    await unhandled.settle();

    expect(onCatch).toHaveBeenCalledTimes(1);
    expect(unhandled.reasons).toEqual([]);
  });

  it("Q14 the store outlives the hook: a captured resolve still settles after unmount", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result, unmount } = setup<string, number>();
    let tracked!: Tracked<number>;

    await act(async () => {
      tracked = track(result.current.push("a"));
    });
    const captured = result.current.head!;
    const { push } = result.current;

    unmount();
    await flushMicrotasks();
    expect(tracked.state()).toBe("pending");

    await act(async () => {
      captured.resolve(7);
    });
    await flushMicrotasks();
    expect(tracked.state()).toBe("fulfilled");
    expect(tracked.value()).toBe(7);

    // A push after unmount is accepted and just waits (nobody can see it).
    const orphan = track(push("b"));
    await flushMicrotasks();
    expect(orphan.state()).toBe("pending");

    expect(error).not.toHaveBeenCalled();
  });

  it("Q15 perf sanity: 500 items pushed at once resolve sequentially quickly", async () => {
    const { result } = setup<number, number>();
    const tracked: Tracked<number>[] = [];
    const started = performance.now();

    await act(async () => {
      for (let i = 0; i < 500; i++) {
        tracked.push(track(result.current.push(i)));
      }
    });

    let steps = 0;
    while (result.current.head) {
      const { head } = result.current;
      expect(head.data).toBe(steps);
      act(() => {
        head.resolve(head.data * 2);
      });
      steps++;
    }
    await flushMicrotasks();

    expect(steps).toBe(500);
    expect(tracked.every((t, i) => t.value() === i * 2)).toBe(true);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
