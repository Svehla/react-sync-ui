import React, { useCallback, useEffect, useState } from "react";

const useComponentDidMount = (fn: Parameters<typeof useEffect>[0]) => {
  useEffect(fn, []);
};

// this function broke the working of the hot reloading
/*
const getSingletonComponentCheck = (errorMsg: string) => {
  let globalMountCounter = 0;

  return () => {
    useComponentDidMount(() => {
      if (globalMountCounter > 0) throw new Error(errorMsg);
      globalMountCounter++;
    });
    return <React.Fragment />;
  };
};
*/

// ------------------------------------------------------------------------------------
// TODO: there is tsdx old typescript parser and new ts fancy syntax is not working...
// https://github.com/jaredpalmer/tsdx/issues/200
// type PromiseQueueAPI<Data, ResolveValue> = ReturnType<typeof usePromiseQueue<any, any>>
type PromiseQueueAPI<Data, ResolveValue> = {
  head?: {
    data: Data;
    resolve: (value: ResolveValue) => void;
    reject: (reason?: any) => void;
  };
  push: (data: Data) => Promise<ResolveValue>;
};

export const usePromiseQueue = <Data, ResolveValue = void>(): PromiseQueueAPI<
  Data,
  ResolveValue
> => {
  const [asyncQueue, setAsyncQueue] = useState(
    [] as {
      data: Data;
      resolve: (arg: ResolveValue) => void;
      reject: (arg: any) => void;
    }[]
  );

  const push = useCallback((data: Data) => {
    return new Promise<ResolveValue>((resolve, reject) =>
      setAsyncQueue(p => [...p, { data, resolve, reject }])
    );
  }, []);

  const resolveHeadItem = useCallback((value: ResolveValue) => {
    setAsyncQueue(queue => {
      const [first, ...rest] = queue;
      first?.resolve(value);
      return rest;
    });
  }, []);

  const rejectHeadItem = useCallback((reason?: any) => {
    setAsyncQueue(queue => {
      const [first, ...rest] = queue;
      first?.reject(reason);
      return rest;
    });
  }, []);

  return {
    head: asyncQueue[0]
      ? {
          data: asyncQueue[0]?.data,
          resolve: resolveHeadItem,
          reject: rejectHeadItem
        }
      : undefined,
    push
  };
};

// ------------------------------------------------------------------------------------

export const syncUIFactory = () => {
  const mutSyncUIComponentsRenderQueue = [] as React.FC<
    PromiseQueueAPI<any, any>
  >[];

  /*
  // this check broke the working of the hot reloading
  const ThrowIfMoreInstances = getSingletonComponentCheck(
    "<SyncUI /> has to be initialized only once"
  );
  */

  return {
    makeSyncUI: <InputData, ResolveValue = void>(
      SyncUIUserComp: React.FC<{
        data: InputData;
        resolve: (value: ResolveValue) => void;
        reject: (reason?: any) => void;
      }>
    ) => {
      type QItem = PromiseQueueAPI<
        { type: Symbol; inputData: InputData; reactCompKey: string },
        ResolveValue
      >;

      const _debugName =
        SyncUIUserComp.displayName ??
        SyncUIUserComp.name ??
        "uniqSymbolMessageType";

      const syncUIComponentType = Symbol(_debugName);

      // object pointer reference with the push key has to be there to change returned mutable reference object while the function is already called
      const singletonSyncUIRef = {
        push: undefined as undefined | QItem["push"]
      };

      const SyncUISingletonComponent = (props: QItem) => {
        useComponentDidMount(() => {
          singletonSyncUIRef.push = props.push;
          return () => (singletonSyncUIRef.push = undefined);
        });

        if (!props.head) return null;
        if (props.head.data.type !== syncUIComponentType) return null;

        return (
          <SyncUIUserComp
            key={props.head.data.reactCompKey}
            data={props.head.data.inputData}
            resolve={props.head.resolve}
            reject={props.head.reject}
          />
        );
      };

      mutSyncUIComponentsRenderQueue.push(SyncUISingletonComponent);

      return (input: InputData) => {
        if (!singletonSyncUIRef.push)
          throw new Error(`You have to initialize <SyncUI />`);

        const reactCompKey = Math.random().toString();
        return singletonSyncUIRef.push({
          type: syncUIComponentType,
          inputData: input,
          reactCompKey
        });
      };
    },
    SyncUI: () => {
      const queue = usePromiseQueue();
      return (
        <>
          {/* <ThrowIfMoreInstances /> */}
          {mutSyncUIComponentsRenderQueue.map((SyncComp, key) => (
            <React.Fragment key={key}>
              <SyncComp {...queue} />
            </React.Fragment>
          ))}
        </>
      );
    }
  };
};
