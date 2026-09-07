import { lateAlert } from "../lateQueue";
import type { Trace } from "./trace";

/** Push into a queue whose `<SyncUI />` may not be on the page yet. */
export const pushBeforeMount = async (trace: Trace, label: string) => {
  trace(`pushed: ${label}`);

  try {
    // Nothing throws and nothing is lost: the call waits in the queue until a
    // <SyncUI /> for it shows up, and only then renders.
    await lateAlert(label);
    trace(`resolved: ${label}`);
  } catch (error) {
    trace(`rejected: ${String(error)}`);
  }
};
