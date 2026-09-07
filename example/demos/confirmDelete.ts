import { syncAlert } from "../syncComponents/SyncAlert";
import { syncConfirm } from "../syncComponents/SyncConfirm";
import type { Trace } from "./trace";

/** Guard a destructive action behind an awaited confirm. */
export const confirmDelete = async (trace: Trace) => {
  const confirmed = await syncConfirm("Delete 3 files?");
  trace(`syncConfirm resolved: ${confirmed}`);

  if (confirmed) {
    await syncAlert("Deleted 3 files.");
    trace("files deleted");
  } else {
    await syncAlert("Kept them, nothing was deleted.");
    trace("files kept");
  }
};
