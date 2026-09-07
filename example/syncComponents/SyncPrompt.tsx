import { useState } from "react";
import { makeSyncUI } from "react-sync-ui";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

export const syncRichPrompt = makeSyncUI<
  {
    title: string;
    description?: string;
    inputLabel?: string;
    inputType?: "password" | "text";
  },
  string
>(props => {
  const [input, setInput] = useState("");

  // A prompt has no neutral answer, so closing it - with Cancel, the x, Escape
  // or a backdrop click - rejects the awaited promise. Every caller therefore
  // has to handle a cancel, which is exactly the point of the demo.
  const close = () => props.reject(new Error("User closed the prompt"));

  return (
    <Dialog title={props.data.title} onClose={close}>
      <form
        onSubmit={e => {
          e.preventDefault();
          setInput("");
          props.resolve(input);
        }}
      >
        {props.data.description && (
          <p className="dialog__description">{props.data.description}</p>
        )}

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
          <Button onClick={close}>Cancel</Button>
          <Button primary type="submit">
            Accept
          </Button>
        </div>
      </form>
    </Dialog>
  );
});

export const syncPrompt = (title: string) => syncRichPrompt({ title });
