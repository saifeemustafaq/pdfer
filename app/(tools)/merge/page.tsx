import type { Metadata } from "next";
import { MergeClient } from "./merge-client";

export const metadata: Metadata = {
  title: "Merge PDFs",
  description:
    "Combine multiple PDFs and images into one PDF file. Drag to reorder, then remove pages.",
};

export default function MergePage() {
  return <MergeClient />;
}
