import { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";

/**
 * `normalizeTokens` marks an empty source line with a single `"\n"` token so a
 * line rendered as a block still takes up height. We separate the lines with our
 * own newline text node instead, so that placeholder has to go - otherwise the
 * panel would carry a character the file does not have and `pre.textContent`
 * would stop being the source verbatim (the copy button hands out the same
 * string, and the e2e suite compares the panel to the file on disk).
 */
const withoutNewlines = (token: { types: string[]; content: string }) => ({
  ...token,
  content: token.content.replace(/\n/g, "")
});

/**
 * The code of the demo that sits next to it. The string always comes from the
 * real module via Vite's `?raw` import, so what you read here cannot drift away
 * from what the button runs. `prism-react-renderer` colours it (tsx grammar,
 * GitHub light theme) without adding or dropping a single character.
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

      <Highlight code={code} language="tsx" theme={themes.github}>
        {({ style, tokens, getTokenProps }) => (
          // only the theme's text colour: the background stays the panel's, so
          // the code block and the bar above it are one surface
          <pre className="code__pre" style={{ color: style.color }}>
            <code>
              {tokens.map((line, lineIndex) => (
                <span key={lineIndex} className="code__line">
                  {line.map((token, tokenIndex) => (
                    <span
                      key={tokenIndex}
                      {...getTokenProps({ token: withoutNewlines(token) })}
                    />
                  ))}
                  {lineIndex < tokens.length - 1 ? "\n" : null}
                </span>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </figure>
  );
};
