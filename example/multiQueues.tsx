import { Button, Modal, ModalFooter, ModalHeader } from "reactstrap";
import { syncUIFactory } from "react-sync-ui";

/**
 * The two queues used by `MultiQueuesApp`.
 *
 * They live here, and not next to the component, so that `MultiQueuesApp.tsx`
 * exports *only* a component and stays a Fast Refresh boundary (see README -
 * "Fast Refresh").
 */
export const syncUI1 = syncUIFactory();
export const syncUI2 = syncUIFactory();

export const syncAlertQueue1 = syncUI1.makeSyncUI<string, void>(props => (
  <Modal isOpen toggle={() => props.resolve()}>
    <ModalHeader>{props.data}</ModalHeader>
    <ModalFooter>
      <Button onClick={() => props.resolve()}>OK</Button>
    </ModalFooter>
  </Modal>
));

export const syncAlertQueue2 = syncUI2.makeSyncUI<string, void>(props => (
  <Modal isOpen toggle={() => props.resolve()}>
    <ModalHeader>{props.data}</ModalHeader>
    <ModalFooter>
      <Button onClick={() => props.resolve()}>OK</Button>
    </ModalFooter>
  </Modal>
));
