import { act } from "react-dom/test-utils";
import { renderHook } from "@testing-library/react";
import { usePromiseQueue } from "../src/syncUI";

describe("usePromiseQueue", () => {
  it("resolve queue", async () => {
    const { result } = renderHook(usePromiseQueue);

    await act(async () => {
      result.current.push("a");
      result.current.push("b");
      result.current.push("c");
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

  it("reject queue", async () => {
    const { result } = renderHook(usePromiseQueue);

    let promiseToResolve: Promise<any>;
    let promiseToReject: Promise<any>;

    await act(async () => {
      promiseToResolve = result.current.push("a");
      promiseToReject = result.current.push(undefined);
      promiseToResolve
        .then(() => expect(1).toBe(1))
        .catch(() => expect(1).toBe(2));
      promiseToReject
        .then(() => expect(1).toBe(2))
        .catch(err => expect("error").toBe(err));
    });

    await act(async () => {
      result.current.head?.resolve(undefined);
      result.current.head?.reject("error");
    });
  });
});
