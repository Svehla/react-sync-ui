import type { ButtonHTMLAttributes } from "react";

/** The only button style in the example: a `.btn`, optionally accented. */
export const Button = ({
  primary,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) => (
  <button
    type="button"
    {...rest}
    className={["btn", primary ? "btn--primary" : null, rest.className]
      .filter(Boolean)
      .join(" ")}
  />
);
