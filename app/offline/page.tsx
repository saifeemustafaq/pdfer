import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
        <WifiOff className="size-7 text-primary" />
      </div>
      <h1 className="font-heading text-xl font-semibold">You are offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Reconnect to use Pdfer. Files are processed in your browser or on the
        server, so a connection is needed to continue.
      </p>
      <Link href="/" className={cn(buttonVariants({ size: "default" }), "min-h-12")}>
        Try again
      </Link>
    </div>
  );
}
