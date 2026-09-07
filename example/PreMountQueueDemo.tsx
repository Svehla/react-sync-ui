import { useState } from "react";
import { Button, Modal, ModalFooter, ModalHeader } from "reactstrap";
import { syncUIFactory } from "react-sync-ui";

/**
 * A queue whose <SyncUI /> is mounted lazily, so we can push into it *before* it
 * exists. Pushing before the mount does not throw any more - the call is queued
 * and rendered as soon as <SyncUI /> shows up.
 *
 * This queue has never had a host, so pushing here and waiting also shows the
 * library's dev-only safety net: after 3s with items pending and no <SyncUI />
 * ever mounted, it logs a console.error telling you to render one.
 */
const lateInstance = syncUIFactory();

const lateAlert = lateInstance.makeSyncUI<string, void>(props => (
  <Modal isOpen toggle={() => props.resolve()}>
    <ModalHeader>{props.data}</ModalHeader>
    <ModalFooter>
      <Button onClick={() => props.resolve()}>OK</Button>
    </ModalFooter>
  </Modal>
));

export const PreMountQueueDemo = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const addLog = (line: string) => setLog(prev => [...prev, line]);

  return (
    <section style={{ marginBottom: "3rem" }}>
      <h2 style={{ fontSize: "1.25rem" }}>
        Pushing before &lt;SyncUI /&gt; is mounted
      </h2>
      <p className="text-muted" style={{ maxWidth: "42rem" }}>
        Push a few alerts while this queue has no <code>&lt;SyncUI /&gt;</code>{" "}
        rendered. Nothing throws, nothing is lost - mount it and they show up in
        order. Wait 3s before mounting and the library logs a dev-only
        console.error reminding you that no <code>&lt;SyncUI /&gt;</code> is
        mounted.
      </p>
      <Button
        onClick={() => {
          const message = `queued before mount #${log.length + 1}`;
          addLog(`pushed: ${message}`);
          lateAlert(message)
            .then(() => addLog(`resolved: ${message}`))
            .catch((error: unknown) => addLog(`rejected: ${String(error)}`));
        }}
      >
        Push into the un-mounted queue
      </Button>{" "}
      <Button color="primary" onClick={() => setIsMounted(m => !m)}>
        {isMounted ? "Unmount" : "Mount"} &lt;SyncUI /&gt;
      </Button>
      <ul>
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      {isMounted && <lateInstance.SyncUI />}
    </section>
  );
};
