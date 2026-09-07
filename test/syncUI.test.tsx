import { act, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { syncUIFactory } from "../src/syncUI";
import type { SyncUIFactory } from "../src/syncUI";
import {
  makeSyncUI as defaultMakeSyncUI,
  SyncUI as DefaultSyncUI
} from "../src/index";
import {
  actDelay,
  delay,
  flushMicrotasks,
  makeAlert,
  makeConfirm,
  makePrompt,
  makeSpyAlert,
  modes,
  renderWithStrict,
  track,
  trackUnhandled
} from "./helpers";
import type { Tracked } from "./helpers";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const button = (name: string) => screen.getByRole("button", { name });
const findButton = (name: string) => screen.findByRole("button", { name });
const queryButton = (name: string) => screen.queryByRole("button", { name });

// ------------------------------------------------------------------------------------

describe.each(modes)("syncUIFactory scenarios ($name)", ({ strict }) => {
  it("identity alerts: three awaited alerts in a row, then the heading", async () => {
    const user = userEvent.setup();
    const syncUI = syncUIFactory();
    let counter = 0;

    const syncAlert = syncUI.makeSyncUI<string, void>(props => (
      <button
        onClick={async () => {
          // an async continuation, like a real handler awaiting something
          await Promise.resolve();
          counter++;
          props.resolve();
        }}
      >
        {props.data}
      </button>
    ));

    const Comp = () => {
      const [text, setText] = useState("");
      return (
        <div>
          <syncUI.SyncUI />
          {text && <h1>{text}</h1>}
          <button
            onClick={async () => {
              await syncAlert("ok1");
              await syncAlert("ok2");
              await syncAlert("ok3");
              setText("abcd");
            }}
          >
            start
          </button>
        </div>
      );
    };

    renderWithStrict(<Comp />, strict);

    await user.click(button("start"));
    await user.click(await findButton("ok1"));
    expect(queryButton("ok1")).not.toBeInTheDocument();
    await user.click(await findButton("ok2"));
    await user.click(await findButton("ok3"));

    expect(await screen.findByRole("heading")).toHaveTextContent("abcd");
    expect(counter).toBe(3);
    expect(queryButton("ok3")).not.toBeInTheDocument();
  });

  it("reject alert: a rejected sync UI lands in the caller's catch", async () => {
    const user = userEvent.setup();
    const syncUI = syncUIFactory();

    const syncAlert = syncUI.makeSyncUI<string, void>(props => (
      <button
        onClick={async () => {
          await Promise.resolve();
          props.reject();
        }}
      >
        {props.data}
      </button>
    ));

    const Comp = () => {
      const [text, setText] = useState("");
      return (
        <div>
          <syncUI.SyncUI />
          {text && <h1>{text}</h1>}
          <button
            onClick={async () => {
              try {
                await syncAlert("ok");
                setText("resolved");
              } catch {
                setText("error");
              }
            }}
          >
            start
          </button>
        </div>
      );
    };

    renderWithStrict(<Comp />, strict);

    await user.click(button("start"));
    await user.click(await findButton("ok"));

    expect(await screen.findByRole("heading")).toHaveTextContent("error");
  });

  it("alert with async queue: unawaited calls queue up and render one at a time", async () => {
    const user = userEvent.setup();
    const syncUI = syncUIFactory();

    const syncAlert = syncUI.makeSyncUI<string, void>(props => (
      <button
        onClick={async () => {
          await Promise.resolve();
          props.resolve();
        }}
      >
        {props.data}
      </button>
    ));

    const Comp = () => {
      const [text, setText] = useState("");
      return (
        <div>
          <syncUI.SyncUI />
          {text && <h1>{text}</h1>}
          <button
            onClick={async () => {
              // Deliberately not awaited: the queue has to serialise them.
              void syncAlert("ok1");
              void syncAlert("ok2");
              void syncAlert("ok3");
              await syncAlert("ok4");
              setText("success");
            }}
          >
            start
          </button>
        </div>
      );
    };

    renderWithStrict(<Comp />, strict);

    await user.click(button("start"));
    for (const label of ["ok1", "ok2", "ok3", "ok4"]) {
      const ok = await findButton(label);
      // exactly one dialog button at a time (plus "start")
      expect(screen.getAllByRole("button")).toHaveLength(2);
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
      await user.click(ok);
    }

    expect(await screen.findByRole("heading")).toHaveTextContent("success");
  });

  it("S1 renders nothing while the queue is empty", () => {
    const factory = syncUIFactory();
    makeAlert(factory);

    const { container } = renderWithStrict(<factory.SyncUI />, strict);

    expect(container).toBeEmptyDOMElement();
  });

  it("S3 wires data/resolve: the promise resolves once the dialog resolves", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);
    renderWithStrict(<factory.SyncUI />, strict);

    let tracked!: Tracked<void>;
    await act(async () => {
      tracked = track(syncAlert("hello"));
    });
    await flushMicrotasks();
    expect(tracked.state()).toBe("pending");

    await user.click(await findButton("hello"));

    await expect(tracked.promise).resolves.toBeUndefined();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("resolves with the value the component passes", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const confirm = makeConfirm(factory);
    renderWithStrict(<factory.SyncUI />, strict);

    let yes!: Tracked<boolean>;
    let no!: Tracked<boolean>;
    await act(async () => {
      yes = track(confirm("first?"));
      no = track(confirm("second?"));
    });

    expect(screen.getByRole("dialog", { name: "first?" })).toBeInTheDocument();
    await user.click(button("yes"));
    expect(screen.getByRole("dialog", { name: "second?" })).toBeInTheDocument();
    await user.click(button("no"));
    await flushMicrotasks();

    expect(yes.value()).toBe(true);
    expect(no.value()).toBe(false);
  });

  it("resolving from a delayed (setTimeout) continuation still advances the queue", async () => {
    const factory = syncUIFactory();
    const slowAlert = factory.makeSyncUI<string, void>(props => (
      <button
        onClick={async () => {
          await delay(5);
          props.resolve();
        }}
      >
        {props.data}
      </button>
    ));
    renderWithStrict(<factory.SyncUI />, strict);

    let first!: Tracked<void>;
    let second!: Tracked<void>;
    await act(async () => {
      first = track(slowAlert("one"));
      second = track(slowAlert("two"));
    });

    fireEvent.click(button("one"));
    expect(button("one")).toBeInTheDocument();
    await actDelay(20);

    expect(first.state()).toBe("fulfilled");
    expect(second.state()).toBe("pending");
    expect(button("two")).toBeInTheDocument();
  });

  it("S2/S6 two different sync components share one FIFO, in call order", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);
    const confirm = makeConfirm(factory);
    renderWithStrict(<factory.SyncUI />, strict);

    let x!: Tracked<void>;
    let q!: Tracked<boolean>;
    let y!: Tracked<void>;
    await act(async () => {
      x = track(syncAlert("x"));
      q = track(confirm("q"));
      y = track(syncAlert("y"));
    });

    expect(button("x")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(queryButton("y")).not.toBeInTheDocument();

    await user.click(button("x"));
    expect(screen.getByRole("dialog", { name: "q" })).toBeInTheDocument();
    expect(queryButton("y")).not.toBeInTheDocument();

    await user.click(button("yes"));
    expect(button("y")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(button("y"));
    await flushMicrotasks();

    expect([x.state(), q.state(), y.state()]).toEqual([
      "fulfilled",
      "fulfilled",
      "fulfilled"
    ]);
    expect(q.value()).toBe(true);
  });

  it("S7 two factories are independent queues with independent hosts", async () => {
    const user = userEvent.setup();
    const f1 = syncUIFactory();
    const f2 = syncUIFactory();
    const alert1 = makeAlert(f1);
    const alert2 = makeAlert(f2);
    renderWithStrict(
      <>
        <f1.SyncUI />
        <f2.SyncUI />
      </>,
      strict
    );

    let one!: Tracked<void>;
    let two!: Tracked<void>;
    await act(async () => {
      one = track(alert1("one"));
      two = track(alert2("two"));
    });

    // both render at the same time: separate queues
    expect(button("one")).toBeInTheDocument();
    expect(button("two")).toBeInTheDocument();

    await user.click(button("one"));
    await flushMicrotasks();
    expect(one.state()).toBe("fulfilled");
    expect(two.state()).toBe("pending");
    expect(queryButton("one")).not.toBeInTheDocument();
    expect(button("two")).toBeInTheDocument();

    await user.click(button("two"));
    await flushMicrotasks();
    expect(two.state()).toBe("fulfilled");
  });

  it("S8 the default singleton exports from src/index work", async () => {
    const user = userEvent.setup();
    const syncAlert = defaultMakeSyncUI<string, string>(props => (
      <button onClick={() => props.resolve(`${props.data}!`)}>
        {props.data}
      </button>
    ));
    renderWithStrict(<DefaultSyncUI />, strict);

    let tracked!: Tracked<string>;
    await act(async () => {
      tracked = track(syncAlert("singleton"));
    });

    await user.click(await findButton("singleton"));

    await expect(tracked.promise).resolves.toBe("singleton!");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("S9 local component state resets between consecutive items", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const prompt = makePrompt(factory);
    renderWithStrict(<factory.SyncUI />, strict);

    let first!: Tracked<string>;
    let second!: Tracked<string>;
    await act(async () => {
      first = track(prompt("first"));
      second = track(prompt("second"));
    });

    expect(screen.getByLabelText("first")).toHaveValue("");
    await user.type(screen.getByRole("textbox"), "abc");
    expect(screen.getByRole("textbox")).toHaveValue("abc");
    await user.click(button("submit"));

    expect(screen.getByLabelText("second")).toHaveValue("");
    await user.type(screen.getByRole("textbox"), "xyz");
    await user.click(button("submit"));
    await flushMicrotasks();

    expect(first.value()).toBe("abc");
    expect(second.value()).toBe("xyz");
  });

  it("S10 the same data pushed twice renders twice, as two instances", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const spy = makeSpyAlert(factory);
    renderWithStrict(<factory.SyncUI />, strict);

    let p1!: Tracked<void>;
    let p2!: Tracked<void>;
    await act(async () => {
      p1 = track(spy.call("dup"));
      p2 = track(spy.call("dup"));
    });

    expect(screen.getAllByRole("button", { name: "dup" })).toHaveLength(1);
    const firstResolve = spy.handlers.get("dup")!.resolve;

    await user.click(button("dup"));
    await flushMicrotasks();
    expect(p1.state()).toBe("fulfilled");
    expect(p2.state()).toBe("pending");
    expect(button("dup")).toBeInTheDocument();
    expect(spy.instanceCount("dup")).toBe(2);
    expect(spy.handlers.get("dup")!.resolve).not.toBe(firstResolve);

    await user.click(button("dup"));
    await flushMicrotasks();
    expect(p2.state()).toBe("fulfilled");
    expect(queryButton("dup")).not.toBeInTheDocument();
  });

  it("S10b the same object pushed twice yields two separate promises", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const data = { label: "obj" };
    const show = factory.makeSyncUI<{ label: string }, { label: string }>(
      props => (
        <button onClick={() => props.resolve(props.data)}>
          {props.data.label}
        </button>
      )
    );
    renderWithStrict(<factory.SyncUI />, strict);

    let p1!: Tracked<{ label: string }>;
    let p2!: Tracked<{ label: string }>;
    await act(async () => {
      p1 = track(show(data));
      p2 = track(show(data));
    });
    expect(p1.promise).not.toBe(p2.promise);

    await user.click(button("obj"));
    await user.click(button("obj"));
    await flushMicrotasks();

    expect(p1.value()).toBe(data);
    expect(p2.value()).toBe(data);
  });

  it("S12 reject(error) propagates the very same Error object to the caller", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const failWith = factory.makeSyncUI<Error, void>(props => (
      <button onClick={() => props.reject(props.data)}>cancel</button>
    ));
    renderWithStrict(<factory.SyncUI />, strict);
    const error = new Error("cancelled");

    let tracked!: Tracked<void>;
    await act(async () => {
      tracked = track(failWith(error));
    });
    await user.click(await findButton("cancel"));

    await expect(tracked.promise).rejects.toBe(error);
    expect(tracked.reason()).toBe(error);
    expect((tracked.reason() as Error).message).toBe("cancelled");
  });

  it("S13 no unhandled rejection when the caller catches", async () => {
    const unhandled = trackUnhandled();
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const confirm = makeConfirm(factory);

    const Comp = () => {
      const [text, setText] = useState("");
      return (
        <div>
          <factory.SyncUI />
          {text && <h1>{text}</h1>}
          <button
            onClick={async () => {
              try {
                await confirm("sure?");
                setText("resolved");
              } catch (error) {
                setText(`caught: ${(error as Error).message}`);
              }
            }}
          >
            start
          </button>
        </div>
      );
    };
    renderWithStrict(<Comp />, strict);

    await user.click(button("start"));
    await user.click(await findButton("cancel"));

    expect(await screen.findByRole("heading")).toHaveTextContent(
      "caught: cancelled"
    );
    await unhandled.settle();
    expect(unhandled.reasons).toEqual([]);
  });

  it("S14 double resolve (submit button + form submit) does not consume the next item", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const doubleOk = factory.makeSyncUI<string, string>(
      function DoubleOk(props) {
        return (
          <form
            onSubmit={event => {
              event.preventDefault();
              props.resolve("submit");
            }}
          >
            <button type="submit" onClick={() => props.resolve("click")}>
              {props.data}
            </button>
          </form>
        );
      }
    );
    renderWithStrict(<factory.SyncUI />, strict);

    let p1!: Tracked<string>;
    let p2!: Tracked<string>;
    await act(async () => {
      p1 = track(doubleOk("1"));
      p2 = track(doubleOk("2"));
    });

    await user.click(button("1"));
    await flushMicrotasks();

    expect(p1.state()).toBe("fulfilled");
    expect(p1.value()).toBe("click");
    expect(p2.state()).toBe("pending");
    expect(button("2")).toBeInTheDocument();

    await user.click(button("2"));
    await flushMicrotasks();
    expect(p2.value()).toBe("click");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("S14b calling the same bound resolve twice in one tick settles only its own item", async () => {
    const factory = syncUIFactory();
    const spy = makeSpyAlert(factory);
    renderWithStrict(<factory.SyncUI />, strict);

    let p1!: Tracked<void>;
    let p2!: Tracked<void>;
    await act(async () => {
      p1 = track(spy.call("a"));
      p2 = track(spy.call("b"));
    });
    const bound = spy.handlers.get("a")!;

    await act(async () => {
      bound.resolve();
      bound.resolve();
      bound.reject(new Error("too late"));
    });
    await flushMicrotasks();

    expect(p1.state()).toBe("fulfilled");
    expect(p2.state()).toBe("pending");
    expect(button("b")).toBeInTheDocument();
  });

  it("S15 a stale resolve/reject from a previous dialog is a no-op", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const spy = makeSpyAlert(factory);
    renderWithStrict(<factory.SyncUI />, strict);

    let p1!: Tracked<void>;
    let p2!: Tracked<void>;
    await act(async () => {
      p1 = track(spy.call("first"));
      p2 = track(spy.call("second"));
    });
    const stale = spy.handlers.get("first")!;

    await user.click(button("first"));
    await flushMicrotasks();
    expect(p1.state()).toBe("fulfilled");
    expect(button("second")).toBeInTheDocument();

    await act(async () => {
      stale.resolve();
      stale.reject(new Error("stale"));
    });
    await flushMicrotasks();

    expect(p2.state()).toBe("pending");
    expect(button("second")).toBeInTheDocument();

    await user.click(button("second"));
    await flushMicrotasks();
    expect(p2.state()).toBe("fulfilled");
  });

  it("S16 a call before <SyncUI /> mounts queues and resolves after mount", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);

    const tracked = track(syncAlert("early"));
    await flushMicrotasks();
    expect(tracked.state()).toBe("pending");

    renderWithStrict(<factory.SyncUI />, strict);

    await user.click(await findButton("early"));
    await expect(tracked.promise).resolves.toBeUndefined();
  });

  it("S17 a call after <SyncUI /> unmounts stays pending and resolves after remount", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);

    const first = renderWithStrict(<factory.SyncUI />, strict);
    first.unmount();

    let tracked!: Tracked<void>;
    await act(async () => {
      tracked = track(syncAlert("later"));
    });
    await flushMicrotasks();
    expect(tracked.state()).toBe("pending");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    renderWithStrict(<factory.SyncUI />, strict);

    await user.click(await findButton("later"));
    await expect(tracked.promise).resolves.toBeUndefined();
  });

  it("S18 an item pending while <SyncUI /> unmounts survives and renders on remount", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);

    const first = renderWithStrict(<factory.SyncUI />, strict);
    let tracked!: Tracked<void>;
    await act(async () => {
      tracked = track(syncAlert("survivor"));
    });
    expect(button("survivor")).toBeInTheDocument();

    first.unmount();
    await flushMicrotasks();
    expect(tracked.state()).toBe("pending");
    expect(queryButton("survivor")).not.toBeInTheDocument();

    renderWithStrict(<factory.SyncUI />, strict);
    await user.click(await findButton("survivor"));
    await expect(tracked.promise).resolves.toBeUndefined();
  });

  it("S19 two <SyncUI /> of one factory render the dialog once and hand over on unmount", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);

    const view = renderWithStrict(
      <>
        <factory.SyncUI key="a" />
        <factory.SyncUI key="b" />
      </>,
      strict
    );

    let x!: Tracked<void>;
    let y!: Tracked<void>;
    await act(async () => {
      x = track(syncAlert("x"));
      y = track(syncAlert("y"));
    });
    expect(screen.getAllByRole("button", { name: "x" })).toHaveLength(1);

    // the first mounted host goes away: the second takes over the same queue
    view.rerender(<factory.SyncUI key="b" />);
    expect(screen.getAllByRole("button", { name: "x" })).toHaveLength(1);

    await user.click(button("x"));
    await flushMicrotasks();
    expect(x.state()).toBe("fulfilled");
    expect(screen.getAllByRole("button", { name: "y" })).toHaveLength(1);

    await user.click(button("y"));
    await flushMicrotasks();
    expect(y.state()).toBe("fulfilled");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("S19b unmounting the second host keeps the first one rendering", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);

    const view = renderWithStrict(
      <>
        <factory.SyncUI key="a" />
        <factory.SyncUI key="b" />
      </>,
      strict
    );
    view.rerender(<factory.SyncUI key="a" />);

    let tracked!: Tracked<void>;
    await act(async () => {
      tracked = track(syncAlert("still here"));
    });
    expect(screen.getAllByRole("button", { name: "still here" })).toHaveLength(
      1
    );

    await user.click(button("still here"));
    await expect(tracked.promise).resolves.toBeUndefined();
  });

  it("S20 makeSyncUI after <SyncUI /> mounted (late registration) works immediately", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    makeAlert(factory);
    renderWithStrict(<factory.SyncUI />, strict);

    const late = factory.makeSyncUI<number, number>(props => (
      <button onClick={() => props.resolve(props.data * 2)}>
        double {props.data}
      </button>
    ));

    let tracked!: Tracked<number>;
    await act(async () => {
      tracked = track(late(21));
    });

    await user.click(await findButton("double 21"));
    await expect(tracked.promise).resolves.toBe(42);
  });

  it("S21 late registration behind an already queued item renders in order", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);
    renderWithStrict(<factory.SyncUI />, strict);

    let first!: Tracked<void>;
    await act(async () => {
      first = track(syncAlert("first"));
    });

    const late = factory.makeSyncUI<string, string>(props => (
      <button onClick={() => props.resolve(props.data.toUpperCase())}>
        {props.data}
      </button>
    ));
    let second!: Tracked<string>;
    await act(async () => {
      second = track(late("late"));
    });

    expect(button("first")).toBeInTheDocument();
    expect(queryButton("late")).not.toBeInTheDocument();

    await user.click(button("first"));
    await flushMicrotasks();
    expect(first.state()).toBe("fulfilled");

    await user.click(await findButton("late"));
    await expect(second.promise).resolves.toBe("LATE");
  });

  it("S22 anonymous, named and displayName components all behave the same", async () => {
    const user = userEvent.setup();
    const factory = syncUIFactory();

    const anonymous = factory.makeSyncUI<string, string>(props => (
      <button onClick={() => props.resolve("anonymous")}>{props.data}</button>
    ));
    const named = factory.makeSyncUI<string, string>(function Named(props) {
      return (
        <button onClick={() => props.resolve("named")}>{props.data}</button>
      );
    });
    const WithDisplayName = (props: {
      data: string;
      resolve: (value: string) => void;
    }) => (
      <button onClick={() => props.resolve("displayName")}>{props.data}</button>
    );
    WithDisplayName.displayName = "Fancy";
    const fancy = factory.makeSyncUI<string, string>(WithDisplayName);

    renderWithStrict(<factory.SyncUI />, strict);

    const results: Tracked<string>[] = [];
    await act(async () => {
      results.push(track(anonymous("a")));
      results.push(track(named("b")));
      results.push(track(fancy("c")));
    });

    for (const label of ["a", "b", "c"]) {
      expect(screen.getAllByRole("button")).toHaveLength(1);
      await user.click(button(label));
    }
    await flushMicrotasks();

    expect(results.map(r => r.value())).toEqual([
      "anonymous",
      "named",
      "displayName"
    ]);
  });

  it("perf sanity: 200 queued dialogs are clicked through quickly", async () => {
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);
    renderWithStrict(<factory.SyncUI />, strict);
    const started = performance.now();

    const tracked: Tracked<void>[] = [];
    await act(async () => {
      for (let i = 0; i < 200; i++) tracked.push(track(syncAlert(`item ${i}`)));
    });

    for (let i = 0; i < 200; i++) {
      fireEvent.click(button(`item ${i}`));
    }
    await flushMicrotasks();

    expect(tracked.every(t => t.state() === "fulfilled")).toBe(true);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(performance.now() - started).toBeLessThan(3000);
  });
});

// ------------------------------------------------------------------------------------

describe("dev warnings", () => {
  const noHostMessage = /no <SyncUI \/> is mounted/;
  const multipleHostsMessage = /more than one <SyncUI \/>/;

  beforeEach(() => {
    // Only the timers the library uses; React's scheduler keeps its own.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  it("warns once after 3s when something is queued and no host ever mounted", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);

    const a = track(syncAlert("a"));
    const b = track(syncAlert("b")); // reuses the pending timer
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(2999);
    expect(error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toMatch(noHostMessage);

    // it is a one-shot: later pushes do not repeat it
    const c = track(syncAlert("c"));
    vi.advanceTimersByTime(10_000);
    expect(error).toHaveBeenCalledTimes(1);

    // the queue itself is intact: a host mounted later drains it in order
    render(<factory.SyncUI />);
    for (const label of ["a", "b", "c"]) {
      fireEvent.click(button(label));
    }
    await flushMicrotasks();
    expect([a.state(), b.state(), c.state()]).toEqual([
      "fulfilled",
      "fulfilled",
      "fulfilled"
    ]);
  });

  it("does not warn when a host mounts within 3s of the first call", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);

    const tracked = track(syncAlert("a"));
    vi.advanceTimersByTime(1000);
    render(<factory.SyncUI />);
    vi.advanceTimersByTime(10_000);

    expect(error).not.toHaveBeenCalled();
    fireEvent.click(button("a"));
    await flushMicrotasks();
    expect(tracked.state()).toBe("fulfilled");
  });

  it("does not warn for calls made after a host has mounted once, even if it is gone", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const factory = syncUIFactory();
    const syncAlert = makeAlert(factory);

    render(<factory.SyncUI />).unmount();
    track(syncAlert("orphan"));
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10_000);

    expect(error).not.toHaveBeenCalled();
  });

  it("warns once when more than one <SyncUI /> of the same factory is mounted", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const factory = syncUIFactory();

    const view = render(
      <>
        <factory.SyncUI key="a" />
        <factory.SyncUI key="b" />
      </>
    );
    expect(warn).not.toHaveBeenCalled();
    act(() => {
      vi.runAllTimers();
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(multipleHostsMessage);

    // a third one does not repeat the warning
    view.rerender(
      <>
        <factory.SyncUI key="a" />
        <factory.SyncUI key="b" />
        <factory.SyncUI key="c" />
      </>
    );
    act(() => {
      vi.runAllTimers();
    });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not warn for a single host, nor for one host per factory", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f1 = syncUIFactory();
    const f2 = syncUIFactory();

    render(
      <>
        <f1.SyncUI />
        <f2.SyncUI />
      </>
    );
    act(() => {
      vi.runAllTimers();
    });

    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn for the HMR overlap (new host mounted before the old one unmounts)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const factory = syncUIFactory();

    const view = render(<factory.SyncUI key="old" />);
    act(() => {
      vi.runAllTimers();
    });
    view.rerender(
      <>
        <factory.SyncUI key="old" />
        <factory.SyncUI key="new" />
      </>
    );
    view.rerender(<factory.SyncUI key="new" />);
    act(() => {
      vi.runAllTimers();
    });

    expect(warn).not.toHaveBeenCalled();
  });

  it("StrictMode's effect replay does not trigger the multiple-host warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const factory = syncUIFactory();

    render(<factory.SyncUI />, { reactStrictMode: true });
    act(() => {
      vi.runAllTimers();
    });

    expect(warn).not.toHaveBeenCalled();
  });

  it("schedules no warnings at all when NODE_ENV is production", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    let prodFactory: () => SyncUIFactory;
    try {
      ({ syncUIFactory: prodFactory } = await import("../src/syncUI"));
    } finally {
      vi.unstubAllEnvs();
    }

    const factory = prodFactory();
    const syncAlert = makeAlert(factory);

    const tracked = track(syncAlert("a"));
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10_000);

    render(
      <>
        <factory.SyncUI key="a" />
        <factory.SyncUI key="b" />
      </>
    );
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(button("a"));
    await flushMicrotasks();
    expect(tracked.state()).toBe("fulfilled");
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
