import type { Metadata } from "next";
import { SplitClient } from "./split-client";

export const metadata: Metadata = {
  title: "Split PDF",
  description:
    "Split a PDF by page range, every N pages, or extract selected pages. Runs on your device.",
};

export default function SplitPage() {
  return <SplitClient />;
}
