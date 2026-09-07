import { useState } from "react";
import { makeSyncUI } from "react-sync-ui";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

export const syncRichPrompt = makeSyncUI<
  {
    title: string;
    description?: string;
    inputLabel?: string;
    canUserReject?: boolean;
    inputType?: "password" | "text";
  },
  string
>(props => {
  const [input, setInput] = useState("");

  // Escape and a backdrop click are the two ways to "close" a native modal
  // dialog; both reject, but only when the caller opted into it.
  const close = () => {
    if (!props.data.canUserReject) return;
    props.reject(new Error("User forced close prompt modal"));
  };

  return (
    <Dialog title={props.data.title} onCancel={close} onBackdropClick={close}>
      <form
        onSubmit={e => {
          e.preventDefault();
          setInput("");
          props.resolve(input);
        }}
      >
        {props.data.description && <p>{props.data.description}</p>}

        <label>
          {props.data.inputLabel}

          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            type={props.data.inputType ?? "text"}
          />
        </label>

        <div className="dialog__footer">
          <Button type="submit">Accept</Button>
        </div>
      </form>
    </Dialog>
  );
});

export const syncPrompt = (title: string) => syncRichPrompt({ title });
