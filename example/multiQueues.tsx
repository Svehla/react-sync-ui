import { syncUIFactory } from "react-sync-ui";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";

/**
 * The two queues used by `MultiQueuesApp`.
 *
 * They live here, and not next to the component, so that `MultiQueuesApp.tsx`
 * exports *only* a component and stays a Fast Refresh boundary (see README -
 * "Fast Refresh").
 *
 * Both dialogs are non-modal (`modal={false}` -> `dialog.show()`). A modal
 * `showModal()` dialog is put in the browser's top layer and makes everything
 * else on the page inert, so the second queue's dialog would be visible but
 * dead. Non-modal keeps both queues clickable at the same time, which is the
 * whole point of this demo.
 */
export const syncUI1 = syncUIFactory();
export const syncUI2 = syncUIFactory();

export const syncAlertQueue1 = syncUI1.makeSyncUI<string, void>(props => (
  <Dialog
    modal={false}
    className="dialog--left"
    title={props.data}
    footer={<Button onClick={() => props.resolve()}>OK</Button>}
  />
));

export const syncAlertQueue2 = syncUI2.makeSyncUI<string, void>(props => (
  <Dialog
    modal={false}
    className="dialog--right"
    title={props.data}
    footer={<Button onClick={() => props.resolve()}>OK</Button>}
  />
));
