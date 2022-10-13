import { act } from "react-dom/test-utils";
import { renderHook } from "@testing-library/react";
import { useAsyncQueue } from "../src/syncUI";
import React from "react";

describe("useAsyncQueue", () => {
  it("identity alerts", async () => {
    const { result } = renderHook(useAsyncQueue);

    await act(() => {
      result.current.registerToQueue(Symbol(), "a");
      result.current.registerToQueue(Symbol(), "b");
      result.current.registerToQueue(Symbol(), "c");
    });

    expect(result.current.head?.data).toBe("a");
    act(() => {
      result.current.head?.resolve(undefined);
    });
    expect(result.current.head?.data).toBe("b");
    act(() => {
      result.current.head?.resolve(undefined);
    });
    expect(result.current.head?.data).toBe("c");
    act(() => {
      result.current.head?.resolve(undefined);
    });
    expect(result.current.head).toBe(undefined);
  });
});
