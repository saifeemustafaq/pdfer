import type { Metadata } from "next";
import { ImageToPdfClient } from "./image-to-pdf-client";

export const metadata: Metadata = {
  title: "Image to PDF",
  description:
    "Convert one or more images to a single PDF file. Supports JPEG and PNG.",
};

export default function ImageToPdfPage() {
  return <ImageToPdfClient />;
}
