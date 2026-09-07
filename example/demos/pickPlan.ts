import { syncAlert } from "../syncComponents/SyncAlert";
import { syncConfirm } from "../syncComponents/SyncConfirm";
import { syncRichPrompt } from "../syncComponents/SyncPrompt";
import type { Trace } from "./trace";

/** A three-step wizard: one `await` per step, top to bottom. */
export const pickPlan = async (trace: Trace) => {
  try {
    const plan = await syncRichPrompt({
      title: "Step 1 of 3: pick a plan",
      description: "free, pro or team",
      inputLabel: "Plan"
    });
    trace(`step 1 - plan: ${plan}`);

    const confirmed = await syncConfirm(`Step 2 of 3: switch to ${plan}?`);
    trace(`step 2 - confirmed: ${confirmed}`);

    if (!confirmed) {
      await syncAlert("No changes made.");
      trace("stopped at step 2");
      return;
    }

    await syncAlert(`Step 3 of 3: you are on the ${plan} plan.`);
    trace("step 3 - done");
  } catch {
    trace("wizard cancelled at step 1");
  }
};
