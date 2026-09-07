// @vitest-environment node
/**
 * Server rendering: the `getServerSnapshot` argument of both
 * `useSyncExternalStore` call sites, which no jsdom test can reach. The node
 * environment means there is no `window` and no DOM at all, so this file
 * deliberately imports neither Testing Library nor ./helpers.
 */
import { renderToString } from "react-dom/server";
import { syncUIFactory, usePromiseQueue } from "../src/syncUI";

const track = <T,>(promise: Promise<T>) => {
  let state = "pending";
  promise.then(
    () => {
      state = "fulfilled";
    },
    () => {
      state = "rejected";
    }
  );
  return { state: () => state };
};

describe("server rendering", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("runs without a window", () => {
    expect(typeof window).toBe("undefined");
  });

  it("<SyncUI /> renders nothing for an empty queue", () => {
    const factory = syncUIFactory();

    expect(renderToString(<factory.SyncUI />)).toBe("");
    expect(vi.getTimerCount()).toBe(0);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it("<SyncUI /> renders nothing for a queued item and schedules no timer", () => {
    const factory = syncUIFactory();
    const syncAlert = factory.makeSyncUI<string, void>(props => (
      <button onClick={() => props.resolve()}>{props.data}</button>
    ));

    const pending = track(syncAlert("server"));

    expect(renderToString(<factory.SyncUI />)).toBe("");
    // The promise can only settle in the browser; nothing here settles it.
    expect(pending.state()).toBe("pending");
    // No 3s no-host warning timer, so a Node process is not held open.
    expect(vi.getTimerCount()).toBe(0);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it("usePromiseQueue renders on the server with an empty head", () => {
    const Owner = () => {
      const queue = usePromiseQueue<string>();
      return <span>{queue.head?.data ?? "empty"}</span>;
    };

    expect(renderToString(<Owner />)).toContain("empty");
    expect(vi.getTimerCount()).toBe(0);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});
