import type { Metadata } from "next";
import { PdfToImageClient } from "./pdf-to-image-client";

export const metadata: Metadata = {
  title: "PDF to image",
  description:
    "Export PDF pages as JPEG or PNG images, downloaded together as a ZIP file.",
};

export default function PdfToImagePage() {
  return <PdfToImageClient />;
}
