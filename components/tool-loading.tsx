import { Skeleton } from "@/components/ui/skeleton";

export function ToolLoading() {
  return (
    <div className="flex flex-col flex-1 px-4 py-8 max-w-2xl mx-auto w-full gap-6">
      <div className="flex items-start gap-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-11 w-40 rounded-lg" />
    </div>
  );
}
