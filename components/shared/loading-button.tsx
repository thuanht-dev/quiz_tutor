"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button>;

export function LoadingButton({
  loading,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: ButtonProps & {
  loading?: boolean;
  loadingText?: string;
}) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn(className)}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
