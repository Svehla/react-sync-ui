import { Component, forwardRef, memo } from "react";
import { describe, expectTypeOf, it } from "vitest";
import type { FC, ReactElement } from "react";
import { syncUIFactory, usePromiseQueue } from "../src/syncUI";
import type {
  PromiseQueueAPI,
  SyncUIComponent,
  SyncUIFactory,
  SyncUIFunction,
  SyncUIProps
} from "../src/syncUI";
import { makeSyncUI, SyncUI } from "../src/index";

const factory = syncUIFactory();

describe("makeSyncUI", () => {
  it("T1/T2 <string, void>: zero-arg resolve, (input: string) => Promise<void>", () => {
    const syncAlert = factory.makeSyncUI<string, void>(props => {
      expectTypeOf(props).toEqualTypeOf<SyncUIProps<string, void>>();
      expectTypeOf(props.data).toEqualTypeOf<string>();
      expectTypeOf(props.resolve).toEqualTypeOf<(value: void) => void>();
      expectTypeOf(props.resolve).toBeCallableWith();
      expectTypeOf(props.reject).toBeCallableWith();
      expectTypeOf(props.reject).toBeCallableWith(new Error("x"));
      expectTypeOf(props.reject).toBeCallableWith("any reason");
      return null;
    });

    expectTypeOf(syncAlert).toEqualTypeOf<(input: string) => Promise<void>>();
    expectTypeOf(syncAlert).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(syncAlert).returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf(syncAlert).toBeCallableWith("x");
    // @ts-expect-error -- input must be a string
    syncAlert(1);
    // @ts-expect-error -- input is required
    syncAlert();
  });

  it("T3 <{ a: number }, boolean>: resolves a boolean, rejects wrong arg types", () => {
    const confirm = factory.makeSyncUI<{ a: number }, boolean>(props => {
      expectTypeOf(props.data).toEqualTypeOf<{ a: number }>();
      expectTypeOf(props.resolve).toEqualTypeOf<(value: boolean) => void>();
      expectTypeOf(props.resolve).toBeCallableWith(true);
      // @ts-expect-error -- boolean expected
      props.resolve(1);
      // @ts-expect-error -- a value is required
      props.resolve();
      return null;
    });

    expectTypeOf(confirm).toEqualTypeOf<
      (input: { a: number }) => Promise<boolean>
    >();
    expectTypeOf(confirm({ a: 1 })).toEqualTypeOf<Promise<boolean>>();
    // @ts-expect-error -- a must be a number
    confirm({ a: "1" });
    // @ts-expect-error -- missing property
    confirm({});
  });

  it("ResolveValue defaults to void", () => {
    const plain = factory.makeSyncUI<number>(props => {
      expectTypeOf(props.resolve).toEqualTypeOf<(value: void) => void>();
      return null;
    });
    expectTypeOf(plain).toEqualTypeOf<(input: number) => Promise<void>>();
  });

  it("infers Data/Result from an explicitly typed SyncUIComponent", () => {
    const component: SyncUIComponent<string, number> = () => null;
    const call = factory.makeSyncUI(component);
    expectTypeOf(call).toEqualTypeOf<(input: string) => Promise<number>>();
  });

  it("SyncUIComponent may return any ReactNode", () => {
    const element: SyncUIComponent<string> = props => props.data;
    const nothing: SyncUIComponent<string> = () => null;
    expectTypeOf(element).toMatchTypeOf<SyncUIComponent<string>>();
    expectTypeOf(nothing).toMatchTypeOf<SyncUIComponent<string>>();
    // @ts-expect-error -- a plain object is not a ReactNode
    const wrong: SyncUIComponent<string> = () => ({ nope: true });
    void wrong;
  });
});

describe("SyncUIProps", () => {
  it("has data, a typed resolve and an untyped reject", () => {
    expectTypeOf<SyncUIProps<string>>().toEqualTypeOf<{
      data: string;
      resolve: (value: void) => void;
      reject: (reason?: unknown) => void;
    }>();
    expectTypeOf<SyncUIProps<{ id: number }, string>>().toEqualTypeOf<{
      data: { id: number };
      resolve: (value: string) => void;
      reject: (reason?: unknown) => void;
    }>();
  });
});

describe("SyncUIFunction", () => {
  it("T15 names what makeSyncUI returns, with ResolveValue defaulting to void", () => {
    expectTypeOf<SyncUIFunction<string, boolean>>().toEqualTypeOf<
      (input: string) => Promise<boolean>
    >();
    expectTypeOf<SyncUIFunction<string>>().toEqualTypeOf<
      (input: string) => Promise<void>
    >();

    const syncConfirm = factory.makeSyncUI<string, boolean>(() => null);
    expectTypeOf(syncConfirm).toEqualTypeOf<SyncUIFunction<string, boolean>>();

    // the shape a consumer wrapper can now be typed against
    const withLogging = <InputData, ResolveValue>(
      call: SyncUIFunction<InputData, ResolveValue>
    ): SyncUIFunction<InputData, ResolveValue> => call;
    expectTypeOf(withLogging(syncConfirm)).toEqualTypeOf<
      SyncUIFunction<string, boolean>
    >();
  });
});

describe("usePromiseQueue", () => {
  it("T4 <string, number>: head and push are typed", () => {
    type API = ReturnType<typeof usePromiseQueue<string, number>>;

    expectTypeOf<API>().toEqualTypeOf<PromiseQueueAPI<string, number>>();
    expectTypeOf<API["push"]>().toEqualTypeOf<
      (data: string) => Promise<number>
    >();
    expectTypeOf<API["head"]>().toEqualTypeOf<
      | {
          data: string;
          resolve: (value: number) => void;
          reject: (reason?: unknown) => void;
        }
      | undefined
    >();
    expectTypeOf<NonNullable<API["head"]>["resolve"]>().toBeCallableWith(1);
    // @ts-expect-error -- resolve value must be a number
    expectTypeOf<NonNullable<API["head"]>["resolve"]>().toBeCallableWith("1");
  });

  it("T5 ResolveValue defaults to void: resolve() takes no argument", () => {
    type Default = ReturnType<typeof usePromiseQueue<string>>;
    type Head = NonNullable<Default["head"]>;

    expectTypeOf<Head["resolve"]>().toEqualTypeOf<(value: void) => void>();
    expectTypeOf<Head["resolve"]>().toBeCallableWith();
    expectTypeOf<Default["push"]>().toEqualTypeOf<
      (data: string) => Promise<void>
    >();
  });

  it("T15b PromiseQueueAPI defaults ResolveValue and reuses SyncUIProps", () => {
    expectTypeOf<PromiseQueueAPI<string>>().toEqualTypeOf<{
      head?: SyncUIProps<string, void>;
      push: (data: string) => Promise<void>;
    }>();
    expectTypeOf<
      NonNullable<PromiseQueueAPI<string, number>["head"]>
    >().toEqualTypeOf<SyncUIProps<string, number>>();
  });

  it("T8 head must be narrowed before use", () => {
    const api = {} as PromiseQueueAPI<string, number>;
    // @ts-expect-error -- head may be undefined
    void api.head.data;
    if (api.head) {
      expectTypeOf(api.head.data).toEqualTypeOf<string>();
    }
    expectTypeOf(api.head?.data).toEqualTypeOf<string | undefined>();
  });
});

describe("SyncUIFactory", () => {
  it("T6 syncUIFactory() returns the documented shape", () => {
    expectTypeOf(factory).toEqualTypeOf<SyncUIFactory>();
    expectTypeOf(syncUIFactory).returns.toEqualTypeOf<SyncUIFactory>();
    expectTypeOf(syncUIFactory).parameters.toEqualTypeOf<[]>();

    expectTypeOf(factory.makeSyncUI).toEqualTypeOf<
      SyncUIFactory["makeSyncUI"]
    >();
    expectTypeOf(factory.SyncUI).toEqualTypeOf<() => ReactElement | null>();
    expectTypeOf(factory.SyncUI).parameters.toEqualTypeOf<[]>();
    expectTypeOf(factory.SyncUI).returns.toEqualTypeOf<ReactElement | null>();
  });

  it("T7 the default exports from src/index have the factory member types", () => {
    expectTypeOf(makeSyncUI).toEqualTypeOf<SyncUIFactory["makeSyncUI"]>();
    expectTypeOf(SyncUI).toEqualTypeOf<SyncUIFactory["SyncUI"]>();

    const syncAlert = makeSyncUI<string, boolean>(() => null);
    expectTypeOf(syncAlert).toEqualTypeOf<
      (input: string) => Promise<boolean>
    >();
  });
});

// This file has a .ts extension (the typecheck glob), so no JSX here: the
// component shapes are what is under test, not their markup.
describe("component shapes accepted by makeSyncUI", () => {
  it("T9 React.FC<SyncUIProps<...>>", () => {
    // React 19's FunctionComponent returns `ReactNode | Promise<ReactNode>`,
    // so this only compiles because SyncUIComponent is a ComponentType.
    const Dialog: FC<SyncUIProps<string, void>> = props => {
      expectTypeOf(props.data).toEqualTypeOf<string>();
      return null;
    };
    const call = factory.makeSyncUI(Dialog);
    expectTypeOf(call).toEqualTypeOf<(input: string) => Promise<void>>();
    expectTypeOf(call).toBeCallableWith("x");
    // @ts-expect-error -- input must be a string
    call(1);
  });

  it("T10 a class component", () => {
    class Confirm extends Component<SyncUIProps<string, boolean>> {
      render() {
        expectTypeOf(this.props.resolve).toBeCallableWith(true);
        return null;
      }
    }
    const call = factory.makeSyncUI(Confirm);
    expectTypeOf(call).toEqualTypeOf<(input: string) => Promise<boolean>>();
    expectTypeOf(call("x")).toEqualTypeOf<Promise<boolean>>();
    // @ts-expect-error -- input must be a string
    call(true);
  });

  it("T11 memo()", () => {
    const Memoized = memo(function Alert(props: SyncUIProps<number, string>) {
      expectTypeOf(props.resolve).toBeCallableWith("ok");
      return null;
    });
    const call = factory.makeSyncUI(Memoized);
    expectTypeOf(call).toEqualTypeOf<(input: number) => Promise<string>>();
    // @ts-expect-error -- input must be a number
    call("1");
  });

  it("T12 forwardRef()", () => {
    const Fwd = forwardRef<HTMLButtonElement, SyncUIProps<string, void>>(
      props => {
        expectTypeOf(props.data).toEqualTypeOf<string>();
        return null;
      }
    );
    const call = factory.makeSyncUI<string, void>(Fwd);
    expectTypeOf(call).toEqualTypeOf<(input: string) => Promise<void>>();
    // @ts-expect-error -- input is required
    call();
  });

  it("T13 zero-arg resolve() stays valid for void results", () => {
    const Dialog: FC<SyncUIProps<string>> = props => {
      expectTypeOf(props.resolve).toBeCallableWith();
      // @ts-expect-error -- void takes no value
      props.resolve("nope");
      return null;
    };
    const call = factory.makeSyncUI(Dialog);
    expectTypeOf(call).toEqualTypeOf<(input: string) => Promise<void>>();
  });

  it("T14 wrong prop shapes are still rejected", () => {
    const WrongData: FC<{
      data: number;
      resolve: (value: void) => void;
    }> = () => null;
    // @ts-expect-error -- data is a string here
    factory.makeSyncUI<string, void>(WrongData);

    const WrongResult: FC<SyncUIProps<string, number>> = () => null;
    // @ts-expect-error -- the factory is declared with a boolean result
    factory.makeSyncUI<string, boolean>(WrongResult);

    class WrongClass extends Component<SyncUIProps<number, void>> {
      render() {
        return null;
      }
    }
    // @ts-expect-error -- data is a string here
    factory.makeSyncUI<string, void>(WrongClass);

    // @ts-expect-error -- not a component at all
    factory.makeSyncUI(42);
  });
});
