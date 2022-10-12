import * as React from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { makeSyncUI } from "../../dist";

export const syncConfirm = makeSyncUI<
  {
    title: string;
    description?: string;
    okBtn?: string;
    notOkBtn?: string;
  },
  boolean
>(props => (
  <Modal isOpen={true} toggle={() => props.resolve(false)}>
    <ModalHeader>{props.data.title}</ModalHeader>

    {props.data.description && <ModalBody>{props.data.description}</ModalBody>}

    <ModalFooter>
      <Button onClick={() => props.resolve(true)}>{props.data.okBtn ?? "Yes"}</Button>
      <Button onClick={() => props.resolve(false)}>{props.data.notOkBtn ?? "No"}</Button>
    </ModalFooter>
  </Modal>
));
