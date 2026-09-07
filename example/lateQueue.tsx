import { syncUIFactory } from "react-sync-ui";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";

/**
 * A third queue whose `<SyncUI />` is mounted lazily by `PreMountQueueDemo`, so
 * calls can be pushed into it *before* its host exists.
 *
 * The factory lives here, and not next to the component, for the reason spelled
 * out in the README ("Fast Refresh"): a hot update must never re-run
 * `syncUIFactory()` and hand the demo a brand new, empty queue.
 */
export const lateInstance = syncUIFactory();

export const lateAlert = lateInstance.makeSyncUI<string, void>(props => (
  <Dialog
    title={props.data}
    onClose={() => props.resolve()}
    footer={
      <Button primary onClick={() => props.resolve()}>
        OK
      </Button>
    }
  />
));
