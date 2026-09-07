import { syncAlertQueue1, syncAlertQueue2 } from "../multiQueues";
import type { Trace } from "./trace";

/** Two queues drain side by side; inside one queue the calls still line up. */
export const runTwoQueues = async (trace: Trace) => {
  await Promise.all([
    syncAlertQueue1("Queue A, first"),
    syncAlertQueue2("Queue B, first"),
    syncAlertQueue1("Queue A, second"),
    syncAlertQueue2("Queue B, second")
  ]);
  trace("both queues drained");

  await syncAlertQueue1("Both queues are done.");
  trace("done");
};
