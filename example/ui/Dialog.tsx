import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

/**
 * A thin wrapper around the native <dialog> element - no UI framework.
 *
 * `modal` (the default) opens it with `showModal()`: the dialog goes into the
 * browser top layer, gets a real `::backdrop` and native close requests, so
 * Escape fires `cancel`. The price is that everything outside it becomes inert,
 * so only ONE modal dialog on the page can be interacted with. The multi-queue
 * demos need two dialogs of two different queues clickable side by side, so
 * they pass `modal={false}` and get `show()` instead: a plain non-modal panel,
 * no backdrop and no Escape, but nothing on the page is made inert.
 */
export const Dialog = (props: {
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  modal?: boolean;
  /**
   * The one "the user wants out" hook: it renders the x button in the header
   * and is what Escape (the native `cancel` event) and a backdrop click call.
   * Leave it out and the dialog has no close control and ignores both.
   */
  onClose?: () => void;
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isModal = props.modal !== false;
  const onClose = props.onClose;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isModal) el.showModal();
    else el.show();
    return () => el.close();
  }, [isModal]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={["dialog", isModal ? null : "dialog--inline", props.className]
        .filter(Boolean)
        .join(" ")}
      // the queue owns this element's lifetime: keep it open on Escape and let
      // resolve/reject unmount it
      onCancel={event => {
        event.preventDefault();
        onClose?.();
      }}
      // a backdrop click is dispatched at the <dialog> itself; content clicks
      // hit .dialog__box or one of its children
      onClick={event => {
        if (event.target === ref.current) onClose?.();
      }}
    >
      <div
        className={["dialog__box", onClose ? "dialog__box--closable" : null]
          .filter(Boolean)
          .join(" ")}
      >
        <h2 className="dialog__title" id={titleId}>
          {props.title}
        </h2>
        {props.children ? (
          <div className="dialog__body">{props.children}</div>
        ) : null}
        {props.footer ? (
          <div className="dialog__footer">{props.footer}</div>
        ) : null}
        {/* Painted in the top-right corner, but deliberately the LAST focusable
            child: `showModal()` focuses the first one, and that has to stay the
            prompt's autoFocus input / the primary button, not "close". */}
        {onClose ? (
          <button
            type="button"
            className="close-btn"
            aria-label="Close"
            onClick={() => onClose()}
          >
            &times;
          </button>
        ) : null}
      </div>
    </dialog>
  );
};
