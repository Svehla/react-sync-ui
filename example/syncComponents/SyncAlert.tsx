import { Button, Modal, ModalFooter, ModalHeader } from "reactstrap";
import { makeSyncUI } from "react-sync-ui";

export const syncAlert = makeSyncUI<string, void>(function SyncAlert(props) {
  return (
    <Modal isOpen={true} toggle={() => props.resolve()}>
      <ModalHeader>{props.data}</ModalHeader>
      <ModalFooter>
        <Button onClick={() => props.resolve()}>OK</Button>
      </ModalFooter>
    </Modal>
  );
});
