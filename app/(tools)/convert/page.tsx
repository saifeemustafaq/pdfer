import type { Metadata } from "next";
import Link from "next/link";
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
    <div className="flex flex-col flex-1 px-4 md:px-6 lg:px-8 py-8 max-w-2xl mx-auto w-full gap-6">
      <div>
        <h1 className="text-2xl font-bold leading-tight">Convert</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a conversion direction below.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {convertOptions.map(({ href, icon: Icon, title, description, actionLabel }) => (
          <Card key={href} className="rounded-xl border-border">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold leading-tight">{title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
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
  );
}
