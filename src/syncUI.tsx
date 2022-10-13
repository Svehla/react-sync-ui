import React, { useCallback, useEffect, useState } from "react";

export const useComponentDidMount = (fn: Parameters<typeof useEffect>[0]) => {
  useEffect(fn, []);
};

const getSingletonCompCheck = (errorMsg: string) => {
  let globalMountCounter = 0;

  return () => {
    useComponentDidMount(() => {
      if (globalMountCounter > 0) throw new Error(errorMsg);
      globalMountCounter++;
    });
    return <React.Fragment />;
  };
};

// should the word "Async" be there? is that relevant or redundant?
export const useAsyncQueue = <Data, ResolveValue = void>() => {
  const [asyncQueue, setAsyncQueue] = useState(
    [] as {
      // TODO: rename type into typeId
      type: Symbol;
      data: Data;
      resolve: (arg: ResolveValue) => void;
      reject: (arg: any) => void;
    }[]
  );

  const registerToQueue = useCallback((type: Symbol, data: Data) => {
    return new Promise<ResolveValue>((resolve, reject) =>
      setAsyncQueue(p => [...p, { type, data, resolve, reject }])
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
          type: asyncQueue[0]?.type,
          resolve: resolveHeadItem,
          reject: rejectHeadItem
        }
      : undefined,
    registerToQueue
  };
};
// https://github.com/jaredpalmer/tsdx/issues/200???
// TODO: there is tsdx old typescript parser and new ts fancy syntax is not working...
// type QueueItem<Data, ResolveValue> = ReturnType<typeof useAsyncQueue<any, any>>
type QueueItem<Data, ResolveValue> = {
  head:
    | {
        data: Data;
        type: Symbol;
        resolve: (value: ResolveValue) => void;
        reject: (reason?: any) => void;
      }
    | undefined;
  registerToQueue: (type: Symbol, data: Data) => Promise<ResolveValue>;
};

export const syncUIFactory = () => {
  const mutSyncUIComponentsRenderQueue = [] as React.FC<QueueItem<any, any>>[];

  const ThrowIfMoreInstances = getSingletonCompCheck(
    "You have to init <SyncUI /> just one time"
  );

  return {
    makeSyncUI: <ArgData, ResolveValue = void>(
      SyncUIUserComp: React.FC<{
        data: ArgData;
        resolve: (value: ResolveValue) => void;
        reject: (reason?: any) => void;
      }>
    ) => {
      const _debugName =
        SyncUIUserComp.displayName ??
        SyncUIUserComp.name ??
        "uniqSymbolMessageType";

      const syncUIComponentType = Symbol(_debugName);

      // object pointer reference with the registerToQueue key has to be there to change returned mutable reference object while the function is already called
      const singletonSyncUIRef = {
        registerToQueue: undefined as
          | undefined
          | QueueItem<ArgData, ResolveValue>["registerToQueue"]
      };

      const SyncUISingletonComp = (props: QueueItem<ArgData, ResolveValue>) => {
        useComponentDidMount(() => {
          singletonSyncUIRef.registerToQueue = props.registerToQueue;
          return () => (singletonSyncUIRef.registerToQueue = undefined);
        });

        if (!props.head) return null;
        if (props.head.type !== syncUIComponentType) return null;

        return (
          <SyncUIUserComp
            data={props.head.data}
            resolve={props.head.resolve}
            reject={props.head.reject}
          />
        );
      };

      mutSyncUIComponentsRenderQueue.push(SyncUISingletonComp);

      return (input: ArgData) => {
        if (!singletonSyncUIRef.registerToQueue)
          throw new Error(`You have to initialize <SyncUI />`);
        return singletonSyncUIRef.registerToQueue(syncUIComponentType, input);
      };
    },
    SyncUI: () => {
      const queue = useAsyncQueue();
      return (
        <>
          <ThrowIfMoreInstances />
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
