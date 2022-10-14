# React sync ui

`React-sync-UI` enable to do the sequential synchronous workflow with usage of
of react components.
Library provide simple `makeSyncUI` function which can transform your declarative React Component
into the promisified functions

## usage example

```tsx
<button
  onClick={async () => {
    const name = await syncPrompt("Fill your name");

    while ((await syncPrompt(`Fill your password!`)) !== "1234") {
      await syncAlert("Invalid password, keep trying");
    }

    await syncAlert(`Congratulation Mr. ${name}, you are logged in`);
  }}
>
  Login
</button>
```

## Installation

```bash
npm i react-sync-ui
```

## Usage

### Setup `<SyncUI />` Component into the root of yout project

```tsx
import { SyncUI } from 'react-sync-ui'

const App = () => (
  <>
    <SyncUI />
    <YourAppStuffs />
  <>
)

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

```

### create sync UI

Now, you just have to define your custom UI which will be promisifed by `react-sync-ui` library.

`makeSyncUI` returns Promise which render your custom React Component and
will be resolve when you call `props.resolve(any)` in the UI

![Sync UI preview](./docs/sync-ui-preview.gif)

#### Alert example

```tsx
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { SyncUI } from "react-sync-ui";

export const syncAlert = makeSyncUI<string, void>((props) => (
  <Modal isOpen={true} toggle={() => props.resolve()}>
    <ModalHeader>{props.data}</ModalHeader>
    <ModalFooter>
      <Button onClick={() => props.resolve()}>OK</Button>
    </ModalFooter>
  </Modal>
);


// usage:

<button
  onClick={async () => {
    await syncAlert("Wait for it...");
    await syncAlert("Wait for it...");
    await syncAlert("You're hacked");
  }}
>
  click to me
</button>;

```

#### Prompt example

```tsx
import { Button, Modal, ModalBody, ModalFooter } from "reactstrap";
import { makeSyncUI } from "react-sync-ui";

export const syncPrompt = makeSyncUI<string, string>((props) => {
  const [input, setInput] = React.useState("");

  return (
    <Modal
      toggle={() => props.reject(new Error("User forced close prompt modal"))}
      isOpen={true}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setInput("");
          props.resolve(input);
        }}
      >
        <ModalBody>
          <label>
            {props.data}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              type="text"
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

// usage:

<button
  onClick={async () => {
    const usersFeelings = await syncPrompt("how are you");
  }}
>
  click to me
</button>;
```

#### Confirm example

```tsx
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
>((props) => (
  <Modal isOpen={true} toggle={() => props.resolve(false)}>
    <ModalHeader>{props.data.title}</ModalHeader>

    <ModalBody>{props.data.description}</ModalBody>

    <ModalFooter>
      <Button autoFocus onClick={() => props.resolve(true)}>
        {props.data.okBtn ?? "Yes"}
      </Button>
      <Button onClick={() => props.resolve(false)}>
        {props.data.notOkBtn ?? "No"}
      </Button>
    </ModalFooter>
  </Modal>
));

// usage:

<button
  onClick={async () => {
    const isOk = await syncConfirm({
      title: "How are you",
      okBtn: "Good",
      notOkBtn: "Not good",
    });
  }}
>
  click to me
</button>;
```
