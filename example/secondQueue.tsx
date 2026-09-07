import { syncUIFactory } from "react-sync-ui";

/**
 * An independent, second queue.
 *
 * It lives in its own module on purpose: a file that exports something which is
 * not a React component is not a Fast Refresh boundary, so keeping the factory
 * out of `App.tsx` / `main.tsx` is what lets those files hot-update instead of
 * forcing a full page reload (see README - "Fast Refresh").
 */
export const secondInstance = syncUIFactory();

// Deliberately NOT a reactstrap <Modal>: a plain panel makes it obvious that
// this dialog is driven by a different queue than the ones above.
export const alert2 = secondInstance.makeSyncUI<string, void>(props => (
  <div
    style={{
      position: "fixed",
      top: 100,
      left: 100,
      width: 400,
      padding: "1rem",
      zIndex: 2000,
      border: "1px solid #999",
      background: "#DDD"
    }}
  >
    <h1>{props.data}</h1>
    <button onClick={() => props.resolve()}>Resolve</button>
  </div>
));
