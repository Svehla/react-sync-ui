# React sync ui

This library enables to synchronous workflow like this where based on the sequential business logic is react state changed

## usage example

```ts
const workflow = async () => {
  let isOk = false;

  const name = await syncPrompt("fill your name");

  let triesCount = 0;

  while (
    (await syncPrompt(`Hello ${name}, fill the secret password!`)) !== userName
  ) {
    await syncAlert("Invalid password, keep trying");
  }

  await syncAlert(`Congratulation Mr. ${userName}, you are logged in`);
};
```

## Installation

```
npm i react-sync-ui
```

## Usage

### Setup SyncUI Component into the root of yout project

```tsx
import { SyncUI } from 'react-sync-ui'

const App = () => (
	<>
		<SyncUI />
		<YourAppStuffs />
	<>
)

ReactDOM.render(<App />, document.getElementById("root"));

```

### Code usage examples

Create your UI connectd to the syncUI wrapper

syncUI enables you to do the abstraction to promisify your react Components

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


/// usage:

<button
  onClick={async () => {
    await syncAlert("You're hacked");
  }}
>
  click to me
</button>;

```

#### Prompt example

```tsx
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
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
        <ModalHeader>{props.data.title}</ModalHeader>

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

/// usage:

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

/// usage:

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
