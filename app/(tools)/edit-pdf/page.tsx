import type { Metadata } from "next";
import { EditPdfClient } from "./edit-pdf-client";

export const metadata: Metadata = {
  title: "Edit PDF",
  description:
    "Reorder, remove, or rotate pages in a PDF. Processing runs in your browser.",
};

export default function EditPdfPage() {
  return <EditPdfClient />;
}
