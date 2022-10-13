import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { syncUIFactory } from "../src/syncUI";
import React, { useState } from "react";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

describe("1", () => {
  it("identity alerts", async () => {
    const syncUI = syncUIFactory();

    const syncAlert = syncUI.makeSyncUI<string, string>(props => {
      return (
        <div
          onClick={async () => {
            await delay(10);
            props.resolve(props.data);
          }}
        >
          {props.data}
        </div>
      );
    });

    const Comp = () => {
      const [text, setText] = useState("");
      return (
        <div>
          {text && <h1 role="heading">{text}</h1>}
          <syncUI.SyncUI />
          <button
            onClick={async () => {
              const a = await syncAlert("a");
              const ab = await syncAlert(a + "b");
              const abc = await syncAlert(ab + "c");
              const abcd = await syncAlert(abc + "d");

              setText(abcd);
            }}
          >
            start
          </button>
        </div>
      );
    };
    render(<Comp />);

    await fireEvent.click(screen.getByText("start"));
    await waitFor(() => fireEvent.click(screen.getByText("a")));
    await waitFor(() => fireEvent.click(screen.getByText("ab")));
    await waitFor(() => fireEvent.click(screen.getByText("abc")));
    await waitFor(() => fireEvent.click(screen.getByText("abcd")));
    await waitFor(() => screen.getByRole("heading"), { timeout: 2_000 });

    expect(screen.getByRole("heading").innerHTML).toBe(`abcd`);
  });
});
