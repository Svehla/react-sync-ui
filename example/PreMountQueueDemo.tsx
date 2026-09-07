import { useState } from "react";
import source from "./demos/pushBeforeMount.ts?raw";
import { pushBeforeMount } from "./demos/pushBeforeMount";
import { lateInstance } from "./lateQueue";
import { Button } from "./ui/Button";
import { CodePanel } from "./ui/CodePanel";
import { Trace } from "./ui/Trace";

/**
 * The queue used here has no `<SyncUI />` until you mount one, which is also
 * what triggers the library's dev-only safety net: 3s with items pending and no
 * host ever mounted logs a console.error telling you to render one.
 */
export const PreMountQueueDemo = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [pushCount, setPushCount] = useState(0);
  const [lines, setLines] = useState<string[]>([]);

  const push = () => {
    const label = `queued before mount #${pushCount + 1}`;
    setPushCount(n => n + 1);
    void pushBeforeMount(line => setLines(prev => [...prev, line]), label);
  };

  return (
    <section className="card">
      <h3 className="card__title">
        Calling before &lt;SyncUI /&gt; is mounted
      </h3>
      <p className="card__intro">
        Push a few alerts while this queue has no <code>&lt;SyncUI /&gt;</code>{" "}
        on the page: nothing throws and nothing is lost - mount the host and
        they show up in order.
      </p>

      <div className="card__actions">
        <Button primary onClick={push}>
          Push into the un-mounted queue
        </Button>
        <Button onClick={() => setIsMounted(m => !m)}>
          {isMounted ? "Unmount" : "Mount"} &lt;SyncUI /&gt;
        </Button>
      </div>

      <CodePanel fileName="demos/pushBeforeMount.ts" code={source} />

      <Trace
        lines={lines}
        hint="Push once or twice, then mount the host and watch them drain."
      />

      {isMounted && <lateInstance.SyncUI />}
    </section>
  );
};
