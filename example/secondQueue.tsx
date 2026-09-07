import { syncUIFactory } from "react-sync-ui";
import { Button } from "./ui/Button";

/**
 * An independent, second queue.
 *
 * It lives in its own module on purpose: a file that exports something which is
 * not a React component is not a Fast Refresh boundary, so keeping the factory
 * out of `App.tsx` / `main.tsx` is what lets those files hot-update instead of
 * forcing a full page reload (see README - "Fast Refresh").
 */
export const secondInstance = syncUIFactory();

// Deliberately NOT a <dialog>: a plain fixed panel makes it obvious that this
// dialog is driven by a different queue than the ones above, and - unlike a
// modal `showModal()` dialog - it never puts the rest of the page in the
// browser's top-layer shadow, so it stays visible next to the other queue.
export const alert2 = secondInstance.makeSyncUI<string, void>(props => (
  <div className="panel">
    <h1>{props.data}</h1>
    <Button onClick={() => props.resolve()}>Resolve</Button>
  </div>
));
