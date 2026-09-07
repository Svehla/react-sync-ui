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
    // closing a confirm without answering is a "no"
    onClose={() => props.resolve(false)}
    footer={
      // The accented answer sits last, on the right. That also makes the
      // *declining* button the first focusable child, which is what
      // `showModal()` focuses - so Enter never confirms something destructive
      // by accident.
      <>
        <Button onClick={() => props.resolve(false)}>
          {props.data.notOkBtn ?? "No"}
        </Button>
        <Button primary onClick={() => props.resolve(true)}>
          {props.data.okBtn ?? "Yes"}
        </Button>
      </>
    }
  >
    {props.data.description}
  </Dialog>
));

export const syncConfirm = (title: string) => syncRichConfirm({ title });
