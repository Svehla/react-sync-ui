import { makeSyncUI } from "react-sync-ui";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

export const syncRichConfirm = makeSyncUI<
  {
    title: string;
    description?: string;
    okBtn?: string;
    notOkBtn?: string;
  },
  boolean
>(props => (
  <Dialog
    title={props.data.title}
    onCancel={() => props.resolve(false)}
    onBackdropClick={() => props.resolve(false)}
    footer={
      <>
        <Button onClick={() => props.resolve(true)}>
          {props.data.okBtn ?? "Yes"}
        </Button>
        <Button onClick={() => props.resolve(false)}>
          {props.data.notOkBtn ?? "No"}
        </Button>
      </>
    }
  >
    {props.data.description}
  </Dialog>
));

export const syncConfirm = (title: string) => syncRichConfirm({ title });
