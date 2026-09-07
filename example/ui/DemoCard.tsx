import { useState } from "react";
import { Button } from "./Button";
import { CodePanel } from "./CodePanel";
import { Trace } from "./Trace";

/**
 * One demo: a task-shaped title, a sentence, the button that runs it, the real
 * source of the handler and the trace it produces.
 */
export const DemoCard = (props: {
  title: string;
  intro: string;
  action: string;
  fileName: string;
  code: string;
  hint?: string;
  run: (trace: (line: string) => void) => Promise<void>;
}) => {
  const [lines, setLines] = useState<string[]>([]);

  const run = () => {
    setLines([]);
    // the handler is deliberately not disabled while it runs: clicking twice
    // queues the flow twice, it never stacks two dialogs
    void props.run(line => setLines(prev => [...prev, line]));
  };

  return (
    <section className="card">
      <h3 className="card__title">{props.title}</h3>
      <p className="card__intro">{props.intro}</p>

      <div className="card__actions">
        <Button primary onClick={run}>
          {props.action}
        </Button>
        {lines.length > 0 && (
          <Button onClick={() => setLines([])}>Clear trace</Button>
        )}
      </div>

      <CodePanel fileName={props.fileName} code={props.code} />

      <Trace
        lines={lines}
        hint={props.hint ?? "Run the demo - every awaited step lands here."}
      />
    </section>
  );
};
