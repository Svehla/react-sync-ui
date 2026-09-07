import { useState } from "react";

/**
 * The code of the demo that sits next to it. The string always comes from the
 * real module via Vite's `?raw` import, so what you read here cannot drift away
 * from what the button runs.
 */
export const CodePanel = (props: { code: string; fileName: string }) => {
  const [isCopied, setIsCopied] = useState(false);
  const code = props.code.trim();

  const copy = () => {
    navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1_500);
      })
      // clipboard access can be denied (insecure origin, permissions) - the
      // code is selectable anyway, so a failed copy is not worth an error
      .catch(() => undefined);
  };

  return (
    <figure className="code">
      <figcaption className="code__bar">
        <span className="code__file">{props.fileName}</span>
        <button type="button" className="code__copy" onClick={copy}>
          {isCopied ? "Copied" : "Copy"}
        </button>
      </figcaption>

      <pre className="code__pre">
        <code>{code}</code>
      </pre>
    </figure>
  );
};
