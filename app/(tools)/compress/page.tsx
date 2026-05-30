import type { Metadata } from "next";
import { CompressClient } from "./compress-client";

export const metadata: Metadata = {
  title: "Compress PDF",
  description:
    "Reduce PDF file size with three quality presets. See the before/after size instantly.",
};

export default function CompressPage() {
  return <CompressClient />;
}
