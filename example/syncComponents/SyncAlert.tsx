import * as React from "react";
import { Button, Modal, ModalFooter, ModalHeader } from "reactstrap";
import { makeSyncUI } from "../../dist";

export const syncAlert = makeSyncUI<string, void>(function SyncAlert(props) {
  return (
    <Modal isOpen={true} toggle={() => props.resolve()}>
      <ModalHeader>{props.data}</ModalHeader>
      <ModalFooter>
        <Button autoFocus onClick={() => props.resolve()} color="primary" variant={"contained"}>
          OK
        </Button>
      </ModalFooter>
    </Modal>
  );
});
