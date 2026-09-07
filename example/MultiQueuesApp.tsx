import source from "./demos/twoQueues.ts?raw";
import { runTwoQueues } from "./demos/twoQueues";
import { syncUI1, syncUI2 } from "./multiQueues";
import { DemoCard } from "./ui/DemoCard";

/**
 * Two independent queues drain in parallel: one dialog per queue on screen at
 * the same time, while the calls inside a single queue still line up one by one.
 *
 * The two hosts are rendered next to the card - each `syncUIFactory()` needs its
 * own `<SyncUI />` somewhere in the tree.
 */
export const MultiQueuesApp = () => (
  <>
    <DemoCard
      title="Two independent queues"
      intro="Every syncUIFactory() owns its own queue, so two dialogs can be open side by side while each queue stays first in, first out."
      action="Run both queues"
      fileName="demos/twoQueues.ts"
      code={source}
      hint="Both dialogs are non-modal, so you can answer them in any order."
      run={runTwoQueues}
    />

    <syncUI1.SyncUI />
    <syncUI2.SyncUI />
  </>
);
