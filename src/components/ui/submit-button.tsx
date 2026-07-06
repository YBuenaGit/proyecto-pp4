"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";
import { Spinner } from "./spinner";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  /** Optional label shown while the form is submitting. Defaults to children. */
  pendingLabel?: ReactNode;
};

/**
 * Submit button that automatically disables itself and shows a spinner while
 * its parent <form> is being submitted. This prevents duplicate submissions
 * (double clicks) and gives the user visual feedback during creation.
 */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const busy = pending || Boolean(disabled);

  return (
    <Button type="submit" disabled={busy} aria-busy={busy} {...props}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
