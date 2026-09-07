import { Button } from "reactstrap";
import {
  syncAlertQueue1,
  syncAlertQueue2,
  syncUI1,
  syncUI2
} from "./multiQueues";

/**
 * Two independent queues drain in parallel: you see one dialog per queue at the
 * same time, while the calls inside a single queue still line up one by one.
 *
 * The sequence is deliberately started by a click, not by a mount effect - under
 * <StrictMode> mount effects run twice in dev and every alert would be pushed
 * twice.
 */
export const MultiQueuesApp = () => {
  const runBothQueues = async () => {
    try {
      await Promise.all([
        syncAlertQueue1("q-1-1"),
        syncAlertQueue2("q-2-1"),
        syncAlertQueue1("q-1-2"),
        syncAlertQueue2("q-2-2")
      ]);
      await syncAlertQueue1("done");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <section style={{ marginBottom: "3rem" }}>
      <h2 style={{ fontSize: "1.25rem" }}>Two independent queues at once</h2>
      <p className="text-muted" style={{ maxWidth: "42rem" }}>
        Each <code>syncUIFactory()</code> owns its own queue. The click below
        pushes two alerts into each queue with a single <code>Promise.all</code>
        : you get one modal per queue on screen at the same time, while{" "}
        <code>q-1-1</code> still comes before <code>q-1-2</code>. Resolve all
        four and a final &quot;done&quot; alert follows.
      </p>

      <Button color="primary" onClick={runBothQueues}>
        Run two queues at once
      </Button>

      <syncUI1.SyncUI />
      <syncUI2.SyncUI />
    </section>
  );
};
