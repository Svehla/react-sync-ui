import { makeSyncUI } from "react-sync-ui";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

export const syncAlert = makeSyncUI<string, void>(function SyncAlert(props) {
  return (
    <Dialog
      title={props.data}
      // an alert has nothing to decide: the x, Escape and the backdrop all mean
      // the same thing as OK
      onClose={() => props.resolve()}
      footer={
        <Button primary onClick={() => props.resolve()}>
          OK
        </Button>
      }
    />
  );
});
