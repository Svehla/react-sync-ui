import "bootstrap/dist/css/bootstrap.min.css";
import "react-app-polyfill/ie11";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Button, Container } from "reactstrap";
import { SyncUI, syncUIFactory } from "../dist";
import { syncAlert } from "./syncComponents/SyncAlert";
import { syncConfirm, syncRichConfirm } from "./syncComponents/SyncConfirm";
import { syncPrompt, syncRichPrompt } from "./syncComponents/SyncPrompt";

export const secondInstance = syncUIFactory();

const alert2 = secondInstance.makeSyncUI<string, void>(props => (
  <div
    style={{
      position: "absolute",
      top: 100,
      left: 100,
      width: "500px",
      height: 500,
      background: "#DDD"
    }}
  >
    <h1>{props.data}</h1>
    <button onClick={() => props.resolve()}>Resolve</button>
  </div>
));

const delay = (time: number) => new Promise(res => setTimeout(res, time));

const App = () => {
  const startHacking = async () => {
    try {
      const userName = "User";

      const shouldContinue = await syncRichConfirm({
        title: `Hi ${userName}!`,
        description: "Do you want to play a game?"
      });
      if (!shouldContinue) {
        await syncAlert(`Bad luck ${userName}, you have to!`);
      }

      let triesCount = 0;

      while (
        (await syncRichPrompt({
          title: `Fill the secret ${userName}!`,
          canUserReject: true,
          inputType: "password"
        })) !== userName
      ) {
        triesCount++;
        await syncAlert(
          triesCount > 3
            ? "Try to fill your user name"
            : `Bad password, keep trying ${userName}`
        );
      }

      await syncAlert(`Congratulation ${userName}, you hacked the system`);
    } catch (error) {
      console.error(error);
      await syncAlert("U quit the G A M E... U Loser!");
      await delay(1_000);
      await syncAlert("LOL, L O S E R - Xd!");
    }
  };

  const phoneCallToContact = async (name: string) => {
    console.log(`call to ${name}`);
  };

  return (
    <Container style={{ paddingTop: "4rem" }}>
      <SyncUI />

      <secondInstance.SyncUI />

      <div style={{ marginBottom: "20rem" }}>
        <Button
          onClick={async () => {
            // call synchronous UI workflow with promisified React components

            const likeSyncUI = await syncConfirm("Do you like this library?");

            if (likeSyncUI) {
              await syncAlert("Thanks, we like you too");
            } else {
              const isUserSure = await syncConfirm("Are you sure?");
              if (isUserSure) {
                await syncAlert("Try to give it a second try");
              } else {
                await syncAlert("Thanks, we like you too");
              }
            }
          }}
        >
          Run
        </Button>
      </div>
      <div style={{ marginBottom: "20rem" }}>
        <Button
          onClick={async () => {
            const name = await syncPrompt("Fill your name");

            while ((await syncPrompt(`Fill your password!`)) !== "1234") {
              await syncAlert("Invalid password, keep trying");
            }

            await syncAlert(`Congratulation ${name}, you are logged in`);
          }}
        >
          Login
        </Button>
      </div>

      <div style={{ marginBottom: "10rem" }}>
        <Button onClick={startHacking} color="primary" variant={"contained"}>
          Start Hacking
        </Button>

        <Button
          onClick={async () => {
            await alert2("1");
            await alert2("2");
            await alert2("3");
          }}
        >
          Start hacking second queue
        </Button>
      </div>
    </Container>
  );
};

ReactDOM.render(<App />, document.getElementById("root")!);
