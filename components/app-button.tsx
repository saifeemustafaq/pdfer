import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button>;

/**
 * Button size standard (see DESIGN_GUIDE §2.1):
 * - PrimaryAction: default size, default variant; one main CTA per tool view
 * - SecondaryAction: default size, outline; supporting actions
 * - DestructiveAction: default size, destructive; clear / reset lists
 * - CardAction: default size; home page tool card links
 * - IconTouch: icon size, 48×48 min; file/page remove controls on mobile
 */

export function PrimaryActionButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      type="button"
      size="default"
      className={cn("gap-2 min-h-10", className)}
      {...props}
    />
  );
}

export function SecondaryActionButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      className={cn("gap-2 min-h-10", className)}
      {...props}
    />
  );
}

export function DestructiveActionButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      type="button"
      variant="destructive"
      size="default"
      className={cn("min-h-10", className)}
      {...props}
    />
  );
}

type CardActionLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function CardActionLink({ href, children, className }: CardActionLinkProps) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ size: "default" }), "w-full min-h-10", className)}
    >
      {children}
    </Link>
  );
}

export function IconTouchButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "min-w-12 min-h-12 shrink-0 text-muted-foreground hover:text-destructive",
        className
      )}
      {...props}
    />
  );
}
