import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CardActionLink } from "@/components/app-button";
import { cn } from "@/lib/utils";

type ToolCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  compact?: boolean;
  className?: string;
};

export function ToolCard({
  href,
  icon: Icon,
  title,
  description,
  actionLabel,
  compact = false,
  className,
}: ToolCardProps) {
  return (
    <Card
      className={cn(
        "h-full rounded-xl border-border ring-1 ring-border hover:ring-primary/20 transition-shadow",
        className
      )}
    >
      <CardContent
        className={cn(
          "flex flex-col h-full",
          compact ? "gap-2.5 p-4" : "gap-4 p-6"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0",
            compact ? "w-9 h-9" : "w-12 h-12 p-2"
          )}
        >
          <Icon className={compact ? "w-4 h-4" : "w-6 h-6"} />
        </div>
        <div className="space-y-0.5 flex-1 min-w-0">
          <h2
            className={cn(
              "font-semibold leading-tight",
              compact ? "text-base" : "text-xl"
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              "text-muted-foreground leading-snug",
              compact ? "text-xs line-clamp-2" : "text-sm leading-relaxed"
            )}
          >
            {description}
          </p>
        </div>
        <CardActionLink href={href}>{actionLabel}</CardActionLink>
      </CardContent>
    </Card>
  );
}
