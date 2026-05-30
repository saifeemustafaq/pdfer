"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { PrimaryActionButton } from "@/components/app-button";
import { ActionButtonGroup } from "@/components/action-button-group";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToolErrorProps = {
  reset: () => void;
};

export function ToolError({ reset }: ToolErrorProps) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4 py-16 text-center gap-6 max-w-md mx-auto">
      <AlertCircle className="w-12 h-12 text-destructive" aria-hidden />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Something went wrong.</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t process your files. Try again or use a smaller file.
        </p>
      </div>
      <ActionButtonGroup>
        <PrimaryActionButton onClick={reset}>Try again</PrimaryActionButton>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "outline", size: "default" }),
            "min-h-10 gap-2"
          )}
        >
          Back to home
        </Link>
      </ActionButtonGroup>
    </div>
  );
}
