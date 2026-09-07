import { syncAlert } from "../syncComponents/SyncAlert";
import { syncPrompt, syncRichPrompt } from "../syncComponents/SyncPrompt";
import type { Trace } from "./trace";

/** Ask again until the password is right - a plain `while` loop, no state. */
export const login = async (trace: Trace) => {
  try {
    const name = await syncPrompt("Who is logging in?");
    trace(`name: ${name}`);

    let attempt = 0;

    while (
      (await syncRichPrompt({
        title: "Your password",
        description: "Psst, it is 1234.",
        inputType: "password"
      })) !== "1234"
    ) {
      attempt += 1;
      trace(`wrong password, attempt ${attempt}`);
      await syncAlert("Not quite. Try 1234.");
    }

    trace("password accepted");
    await syncAlert(`Welcome back, ${name}!`);
  } catch {
    // Closing either prompt ends the loop here instead of looping forever.
    trace("login cancelled");
  }
};
