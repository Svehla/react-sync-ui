import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { syncUIFactory } from "../src/syncUI";
import React, { useState } from "react";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

describe("1", () => {
  it("identity alerts", async () => {
    const syncUI = syncUIFactory();

    let counter = 0;

    const syncAlert = syncUI.makeSyncUI<string, void>(props => (
      <button
        onClick={async () => {
          await delay(10);
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
          {text && <h1 role="heading">{text}</h1>}
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

    render(<Comp />);

    fireEvent.click(screen.getByText("start"));
    await waitFor(() => fireEvent.click(screen.getByText("ok1")));
    await waitFor(() => fireEvent.click(screen.getByText("ok2")));
    await waitFor(() => fireEvent.click(screen.getByText("ok3")));
    await waitFor(() => screen.getByRole("heading"));

    expect(screen.getByRole("heading").innerHTML).toBe("abcd");
    expect(counter).toBe(3);
  });

  it("reject alert", async () => {
    const syncUI = syncUIFactory();

    const syncAlert = syncUI.makeSyncUI<string, void>(props => (
      <button
        onClick={async () => {
          await delay(10);
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
          {text && <h1 role="heading">{text}</h1>}
          <button
            onClick={async () => {
              try {
                await syncAlert("ok");
              } catch (err) {
                setText("error");
              }
            }}
          >
            start
          </button>
        </div>
      );
    };

    render(<Comp />);

    fireEvent.click(screen.getByText("start"));
    await waitFor(() => fireEvent.click(screen.getByText("ok")));
    await waitFor(() => screen.getByRole("heading"));

    expect(screen.getByRole("heading").innerHTML).toBe("error");
  });

  it("alert with async queue", async () => {
    const syncUI = syncUIFactory();

    const syncAlert = syncUI.makeSyncUI<string, void>(props => (
      <button
        onClick={async () => {
          await delay(10);
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
          {text && <h1 role="heading">{text}</h1>}
          <button
            onClick={async () => {
              // there missing await because we need to check if the asyncQueue is working
              syncAlert("ok1");
              syncAlert("ok2");
              syncAlert("ok3");
              // thanks to queue, this code is still synchronous
              await syncAlert("ok4");
              setText("success");
            }}
          >
            start
          </button>
        </div>
      );
    };

    render(<Comp />);

    fireEvent.click(screen.getByText("start"));
    await waitFor(() => fireEvent.click(screen.getByText("ok1")));
    await waitFor(() => fireEvent.click(screen.getByText("ok2")));
    await waitFor(() => fireEvent.click(screen.getByText("ok3")));
    await waitFor(() => fireEvent.click(screen.getByText("ok4")));
    await waitFor(() => screen.getByRole("heading"));

    expect(screen.getByRole("heading").innerHTML).toBe("success");
  });
});
