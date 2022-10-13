import "bootstrap/dist/css/bootstrap.min.css";
import "react-app-polyfill/ie11";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Button } from "reactstrap";
import { SyncUI, syncUIFactory } from "../dist";
import { syncAlert } from "./syncComponents/SyncAlert";
// import { syncBarcodeScan } from "./syncComponents/SyncBarcodeScan";
import { syncConfirm } from "./syncComponents/SyncConfirm";
import { syncPrompt } from "./syncComponents/SyncPrompt";

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
      const userName = "xxx";
      // await syncBarcodeScan({
      //   title: "Please, upload your user name",
      //   canUserReject: true
      // });

      const shouldContinue = await syncConfirm({
        title: `Hi ${userName}!`,
        description: "Do you want to play a game?"
      });
      if (!shouldContinue) {
        await syncAlert(`Bad luck Mr. ${userName}, you have to!`);
      }

      let triesCount = 0;

      while (
        (await syncPrompt({
          title: `Fill the secret Mr. ${userName}!`,
          canUserReject: true,
          inputType: "password"
        })) !== userName
      ) {
        triesCount++;
        await syncAlert(
          triesCount > 3
            ? "Try to fill your user name"
            : `Bad password, keep trying Mr. ${userName}`
        );
      }

      await syncAlert(`Congratulation Mr. ${userName}, you hacked the system`);
    } catch (error) {
      console.error(error);
      await syncAlert("U quit the G A M E... U Loser!");
      await delay(1_000);
      await syncAlert("LOL, L O S E R - Xd!");
    }
  };

  return (
    <>
      <SyncUI />
      <secondInstance.SyncUI />

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
    </>
  );
};

ReactDOM.render(<App />, document.getElementById("root")!);
