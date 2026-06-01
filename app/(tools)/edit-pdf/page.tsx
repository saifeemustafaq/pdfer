import type { Metadata } from "next";
import { EditPdfClient } from "./edit-pdf-client";

export const metadata: Metadata = {
  title: "Edit PDF",
  description:
    "Reorder pages, add a text watermark, fill forms, or sign. Processing runs in your browser.",
};

export default function EditPdfPage() {
  return <EditPdfClient />;
}
