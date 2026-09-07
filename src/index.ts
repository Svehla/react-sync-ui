import { syncUIFactory } from "./syncUI.js";

export { syncUIFactory, usePromiseQueue } from "./syncUI.js";
export type {
  PromiseQueueAPI,
  SyncUIComponent,
  SyncUIFactory,
  SyncUIProps
} from "./syncUI.js";

export const { makeSyncUI, SyncUI } = syncUIFactory();
