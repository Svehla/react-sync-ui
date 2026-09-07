/**
 * Every demo handler gets one of these from the UI and calls it once per
 * awaited step. The page renders the lines as they arrive, so you can watch the
 * `await`s in the code below resolve one by one.
 */
export type Trace = (line: string) => void;
