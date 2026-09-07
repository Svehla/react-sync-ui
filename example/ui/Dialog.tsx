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
  /** Escape / native close request. Modal dialogs only. */
  onCancel?: () => void;
  /** Click on the ::backdrop, i.e. outside the box. Modal dialogs only. */
  onBackdropClick?: () => void;
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isModal = props.modal !== false;

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
        props.onCancel?.();
      }}
      // a backdrop click is dispatched at the <dialog> itself; content clicks
      // hit .dialog__box or one of its children
      onClick={event => {
        if (event.target === ref.current) props.onBackdropClick?.();
      }}
    >
      <div className="dialog__box">
        <h2 className="dialog__title" id={titleId}>
          {props.title}
        </h2>
        {props.children ? (
          <div className="dialog__body">{props.children}</div>
        ) : null}
        {props.footer ? (
          <div className="dialog__footer">{props.footer}</div>
        ) : null}
      </div>
    </dialog>
  );
};
