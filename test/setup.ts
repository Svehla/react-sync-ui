import "@testing-library/jest-dom/vitest";

// @testing-library/dom only advances fake timers inside waitFor/findBy* when a
// global `jest` object exists. Vitest never defines one, so with
// vi.useFakeTimers() every waitFor() would hang until the test times out.
// This shim is the only piece @testing-library/dom actually calls.
if (!("jest" in globalThis)) {
  Object.assign(globalThis, {
    jest: { advanceTimersByTime: vi.advanceTimersByTime.bind(vi) }
  });
}
