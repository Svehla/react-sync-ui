import { SyncUI } from "react-sync-ui";
import askNameSource from "./demos/askName.ts?raw";
import confirmDeleteSource from "./demos/confirmDelete.ts?raw";
import loginSource from "./demos/login.ts?raw";
import pickPlanSource from "./demos/pickPlan.ts?raw";
import { askName } from "./demos/askName";
import { confirmDelete } from "./demos/confirmDelete";
import { login } from "./demos/login";
import { pickPlan } from "./demos/pickPlan";
import { MultiQueuesApp } from "./MultiQueuesApp";
import { PreMountQueueDemo } from "./PreMountQueueDemo";
import { DemoCard } from "./ui/DemoCard";

/**
 * This file exports a component and nothing else, which keeps it a Fast Refresh
 * boundary: editing `demos/*` or `syncComponents/*` hot-updates the app instead
 * of reloading the page and losing the dialog that is open (see README - "Fast
 * Refresh").
 */
export const App = () => (
  <main className="page">
    {/* the default queue, shared by every demo in the first section */}
    <SyncUI />

    <header className="hero">
      <h1 className="hero__title">react-sync-ui</h1>
      <p className="hero__tagline">
        Await a dialog like any other function:{" "}
        <code>const ok = await syncConfirm(&quot;Delete 3 files?&quot;)</code>
      </p>
      <nav className="hero__links">
        <a href="https://github.com/Svehla/react-sync-ui">GitHub</a>
        <a href="https://www.npmjs.com/package/react-sync-ui">npm</a>
      </nav>
    </header>

    <h2 className="section__title">Demos</h2>
    <p className="section__intro">
      Four everyday tasks. Each one shows the handler that runs it - the exact
      source of the file, not a copy - and traces every awaited step as you
      click through the dialogs.
    </p>

    <DemoCard
      title="Confirm before a destructive action"
      intro="Ask first, then act: the answer is the value the await returns, so branching on it is a plain if."
      action="Delete files"
      fileName="demos/confirmDelete.ts"
      code={confirmDeleteSource}
      run={confirmDelete}
    />

    <DemoCard
      title="Ask for a value"
      intro="A prompt resolves with what the user typed - and rejects when they close it, so a cancel is just a catch."
      action="Ask my name"
      fileName="demos/askName.ts"
      code={askNameSource}
      hint="Try it once with a name, once with the x."
      run={askName}
    />

    <DemoCard
      title="Login with retries"
      intro="A while loop around an awaited prompt keeps asking until the password is 1234 - no state machine, no 'is the modal open' flag."
      action="Log in"
      fileName="demos/login.ts"
      code={loginSource}
      hint="Close a prompt with the x to cancel the whole loop."
      run={login}
    />

    <DemoCard
      title="A small wizard"
      intro="Three chained steps read top to bottom: pick a plan, confirm it, done."
      action="Start the wizard"
      fileName="demos/pickPlan.ts"
      code={pickPlanSource}
      run={pickPlan}
    />

    <hr className="divider" />

    <h2 className="section__title">Advanced</h2>
    <p className="section__intro">
      The two mechanics behind the demos above: independent queues, and what
      happens when you call one before its host is on the page.
    </p>

    <MultiQueuesApp />
    <PreMountQueueDemo />

    <footer className="footer">
      Every dialog here is a native <code>&lt;dialog&gt;</code> element and one
      small stylesheet - no UI framework. Nothing opens on page load: each demo
      starts from a click.
    </footer>
  </main>
);
