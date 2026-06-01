import { Code2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GITHUB_REPO_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function GitHubRepoLink() {
  return (
    <a
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "outline", size: "default" }),
        "gap-2 min-h-10 inline-flex items-center justify-center"
      )}
      aria-label="View source code on GitHub (opens in a new tab)"
    >
      <Code2 className="w-4 h-4" aria-hidden />
      View source on GitHub
    </a>
  );
}
