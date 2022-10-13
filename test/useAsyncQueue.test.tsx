import { act } from "react-dom/test-utils";
import { renderHook } from "@testing-library/react";
import { useAsyncQueue } from "../src/syncUI";

// TODO: test use cases
// - reject
// - async delay behavior
describe("useAsyncQueue", () => {
  it("resolve queue", async () => {
    const { result } = renderHook(useAsyncQueue);

    await act(async () => {
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

  it("reject queue", async () => {
    const { result } = renderHook(useAsyncQueue);

    let promiseToReject: Promise<any>;

    let id = Symbol();
    await act(async () => {
      result.current.registerToQueue(id, "a");
      promiseToReject = result.current.registerToQueue(id, undefined);

      promiseToReject
        .then(() => {
          expect(1).toBe(2);
        })
        .catch(err => {
          expect("error").toBe(err);
        });
    });

    await act(async () => {
      result.current.head?.resolve(undefined);
      result.current.head?.reject("error");
    });
  });
});
