import { makeSyncUI } from "react-sync-ui";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

export const syncAlert = makeSyncUI<string, void>(function SyncAlert(props) {
  return (
    <Dialog
      title={props.data}
      onCancel={() => props.resolve()}
      onBackdropClick={() => props.resolve()}
      footer={<Button onClick={() => props.resolve()}>OK</Button>}
    />
  );
});
