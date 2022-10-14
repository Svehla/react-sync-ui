import * as React from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { makeSyncUI } from "../../dist";

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
  const [input, setInput] = React.useState("");

  return (
    <Modal
      isOpen={true}
      toggle={() => {
        if (!props.data.canUserReject) return;
        props.reject(new Error("User forced close prompt modal"));
      }}
    >
      <form
        onSubmit={e => {
          e.preventDefault();
          setInput("");
          props.resolve(input);
        }}
      >
        <ModalHeader>{props.data.title}</ModalHeader>

        {props.data.description && (
          <ModalBody>{props.data.description}</ModalBody>
        )}

        <ModalBody>
          <label>
            {props.data.inputLabel}

            <input
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              type={props.data.inputType ?? "text"}
            />
          </label>
        </ModalBody>

        <ModalFooter>
          <Button type="submit">Accept</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
});

export const syncPrompt = (title: string) => syncRichPrompt({ title });
