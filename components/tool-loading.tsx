import { ToolLanding } from "@/components/tool-landing";
import { Skeleton } from "@/components/ui/skeleton";

export function ToolLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-background/95 px-4 py-5 backdrop-blur-sm md:px-6 lg:px-8">
        <div className="flex items-start gap-4">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
        </div>
      </header>
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <ToolLanding>
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </ToolLanding>
      </div>
    </div>
  );
}
