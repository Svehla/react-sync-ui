import * as React from "react";
import { Button, Modal, ModalFooter, ModalHeader } from "reactstrap";
import { syncUIFactory } from "../dist";
import { useEffect } from "react";

const useComponentDidMount = (fn: () => Promise<void>) => {
  useEffect(() => {
    fn();
  }, []);
};

export const syncUI1 = syncUIFactory();
export const syncUI2 = syncUIFactory();

const syncAlertQueue1 = syncUI1.makeSyncUI<string, void>(props => (
  <Modal isOpen toggle={() => props.resolve()}>
    <ModalHeader>{props.data}</ModalHeader>
    <ModalFooter>
      <Button onClick={() => props.resolve()}>OK</Button>
    </ModalFooter>
  </Modal>
));

const syncAlertQueue2 = syncUI2.makeSyncUI<string, void>(props => (
  <Modal isOpen toggle={() => props.resolve()}>
    <ModalHeader>{props.data}</ModalHeader>
    <ModalFooter>
      <Button onClick={() => props.resolve()}>OK</Button>
    </ModalFooter>
  </Modal>
));

export const MultiQueuesApp = () => {
  useComponentDidMount(async () => {
    await Promise.all([
      syncAlertQueue1("q-1-1"),
      syncAlertQueue2("q-2-1"),
      syncAlertQueue1("q-1-2"),
      syncAlertQueue2("q-2-2")
    ]);
    syncAlertQueue1("done");
  });

  return (
    <>
      <syncUI1.SyncUI />
      <syncUI2.SyncUI />
    </>
  );
};
