import { syncAlert } from "../syncComponents/SyncAlert";
import { syncPrompt } from "../syncComponents/SyncPrompt";
import type { Trace } from "./trace";

/** Read a value from the user - and handle the cancel. */
export const askName = async (trace: Trace) => {
  try {
    const name = await syncPrompt("What's your name?");
    trace(`syncPrompt resolved: "${name}"`);

    await syncAlert(`Nice to meet you, ${name || "stranger"}!`);
    trace("greeting shown");
  } catch {
    // Closing a prompt rejects the awaited promise, so a cancel is just a
    // `catch` - no "did the user answer?" flag anywhere.
    trace("syncPrompt rejected: the user cancelled");
  }
};
