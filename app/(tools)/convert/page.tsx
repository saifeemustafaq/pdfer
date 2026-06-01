import type { Metadata } from "next";
import { Images, FileImage } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CardActionLink } from "@/components/app-button";
import { TOOL_ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Convert",
  description: "Convert between PDF and images: image to PDF or PDF to image.",
};

const convertOptions = [
  {
    href: TOOL_ROUTES.imageToPdf,
    icon: Images,
    title: "Image to PDF",
    description: "Combine JPEG or PNG images into one PDF file.",
    actionLabel: "Open tool",
  },
  {
    href: TOOL_ROUTES.pdfToImage,
    icon: FileImage,
    title: "PDF to image",
    description: "Export every page as JPEG or PNG, downloaded as a ZIP.",
    actionLabel: "Open tool",
  },
] as const;

export default function ConvertHubPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-background/95 px-4 py-5 backdrop-blur-sm md:px-6 lg:px-8">
        <h1 className="text-2xl font-bold leading-tight">Convert</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a conversion direction below.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {convertOptions.map(({ href, icon: Icon, title, description, actionLabel }) => (
            <Card key={href} className="rounded-xl border-border">
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold leading-tight">{title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
                <CardActionLink href={href}>{actionLabel}</CardActionLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
