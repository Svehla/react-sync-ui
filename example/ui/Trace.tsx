/**
 * The live read-out under every demo: one line per awaited step, appended as
 * the promises resolve, so the list ends up mirroring the code panel above it.
 */
export const Trace = (props: { lines: string[]; hint: string }) => (
  <div className="trace" aria-live="polite">
    <span className="trace__label">trace</span>

    {props.lines.length === 0 ? (
      <p className="trace__empty">{props.hint}</p>
    ) : (
      <ol className="trace__list">
        {props.lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
    )}
  </div>
);
