import {
  syncAlertQueue1,
  syncAlertQueue2,
  syncUI1,
  syncUI2
} from "./multiQueues";
import { Button } from "./ui/Button";

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
    <section className="demo">
      <h2>Two independent queues at once</h2>
      <p className="muted">
        Each <code>syncUIFactory()</code> owns its own queue. The click below
        pushes two alerts into each queue with a single <code>Promise.all</code>
        : you get one dialog per queue on screen at the same time, while{" "}
        <code>q-1-1</code> still comes before <code>q-1-2</code>. Resolve all
        four and a final &quot;done&quot; alert follows. Both dialogs are
        non-modal <code>&lt;dialog&gt;</code> panels - a modal one would make
        the other queue&apos;s dialog inert.
      </p>

      <Button primary onClick={runBothQueues}>
        Run two queues at once
      </Button>

      <syncUI1.SyncUI />
      <syncUI2.SyncUI />
    </section>
  );
};
