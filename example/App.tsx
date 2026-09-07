import { useState } from "react";
import type { ReactNode } from "react";
import { SyncUI } from "react-sync-ui";
import { MultiQueuesApp } from "./MultiQueuesApp";
import { PreMountQueueDemo } from "./PreMountQueueDemo";
import { alert2, secondInstance } from "./secondQueue";
import { syncAlert } from "./syncComponents/SyncAlert";
import { syncConfirm, syncRichConfirm } from "./syncComponents/SyncConfirm";
import { syncPrompt, syncRichPrompt } from "./syncComponents/SyncPrompt";
import { Button } from "./ui/Button";

const delay = (time: number) => new Promise(res => setTimeout(res, time));

/** One demo block: heading, one-line explanation, then the buttons. */
const Demo = (props: {
  title: string;
  children: ReactNode;
  description: ReactNode;
}) => (
  <section className="demo">
    <h2>{props.title}</h2>
    <p className="muted">{props.description}</p>
    {props.children}
  </section>
);

/**
 * This file exports a component and nothing else, which keeps it a Fast Refresh
 * boundary: editing `syncComponents/*` hot-updates the app instead of reloading
 * the page and losing the dialog that is open (see README - "Fast Refresh").
 */
export const App = () => {
  // Shows on the page what the `catch` block below actually received.
  const [lastRejection, setLastRejection] = useState<string | null>(null);

  const startHacking = async () => {
    setLastRejection(null);
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
      // Closing the password prompt calls props.reject(...), which rejects the
      // awaited promise - so a plain try/catch handles "user cancelled".
      setLastRejection(String(error));
      console.error(error);
      await syncAlert("U quit the G A M E... U Loser!");
      await delay(1_000);
      await syncAlert("LOL, L O S E R - Xd!");
    }
  };

  return (
    <main className="container">
      {/* the default queue */}
      <SyncUI />
      {/* an independent, second queue */}
      <secondInstance.SyncUI />

      <h1>react-sync-ui playground</h1>
      <p className="muted">
        Every dialog below is a normal React component turned into an awaitable
        function by <code>makeSyncUI</code>. Nothing opens on page load - each
        demo starts from a click, so the control flow you read in the handler is
        exactly the control flow you see on screen. Open the console to follow
        along.
      </p>
      <hr />

      <Demo
        title="Awaiting a dialog like a function call"
        description={
          <>
            <code>await syncConfirm(...)</code> returns the button the user
            pressed, so branching on the answer is just an <code>if</code>. The
            follow-up dialogs are queued: they open one after another, never on
            top of each other.
          </>
        }
      >
        <Button
          onClick={async () => {
            // call a synchronous UI workflow made of promisified React components
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
      </Demo>

      <Demo
        title="Looping until the input is right"
        description={
          <>
            A <code>while</code> loop around <code>await syncPrompt(...)</code>{" "}
            - no state machine, no &quot;is the modal open&quot; flag. The
            password is <code>1234</code>.
          </>
        }
      >
        <Button
          onClick={async () => {
            const name = await syncPrompt("Fill your name");

            while (
              (await syncRichPrompt({
                title: "Fill your password!",
                inputType: "password"
              })) !== "1234"
            ) {
              await syncAlert("Invalid password, keep trying");
            }

            await syncAlert(`Congratulation ${name}, you are logged in`);
          }}
        >
          Login
        </Button>
      </Demo>

      <Demo
        title="Cancelling: props.reject caught with try/catch"
        description={
          <>
            The password prompt is created with <code>canUserReject</code>, so
            closing it (backdrop or Esc) calls <code>props.reject(...)</code>{" "}
            and the awaited promise rejects. The handler catches it in a plain{" "}
            <code>try/catch</code>. Type <code>User</code> to win instead. The
            second button pushes three alerts into an independent queue built
            with <code>syncUIFactory()</code>.
          </>
        }
      >
        <Button primary onClick={startHacking}>
          Start Hacking
        </Button>{" "}
        <Button
          onClick={async () => {
            await alert2("1");
            await alert2("2");
            await alert2("3");
          }}
        >
          Start hacking second queue
        </Button>
        {lastRejection && (
          <p className="danger">
            caught in <code>catch</code>: {lastRejection}
          </p>
        )}
      </Demo>

      <MultiQueuesApp />

      <PreMountQueueDemo />
    </main>
  );
};
