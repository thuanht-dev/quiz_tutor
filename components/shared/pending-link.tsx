"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ComponentProps, type MouseEvent } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiLoading } from "@/stores/ui-loading";

type Props = ComponentProps<typeof Link> & {
  loadingClassName?: string;
  showSpinner?: boolean;
};

export function PendingLink({
  href,
  className,
  children,
  onClick,
  loadingClassName,
  showSpinner = true,
  ...props
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const startNavigation = useUiLoading((s) => s.startNavigation);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (props.target === "_blank") return;

    event.preventDefault();
    startNavigation();
    startTransition(() => {
      router.push(typeof href === "string" ? href : href.toString());
    });
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-busy={pending || undefined}
      className={cn(className, pending && loadingClassName, pending && "pointer-events-none opacity-80")}
      {...props}
    >
      {pending && showSpinner ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {children}
        </span>
      ) : (
        children
      )}
    </Link>
  );
}
