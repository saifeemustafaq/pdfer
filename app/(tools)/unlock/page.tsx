import type { Metadata } from "next";
import { UnlockClient } from "./unlock-client";

export const metadata: Metadata = {
  title: "Unlock PDF",
  description:
    "Remove a password from a PDF you own. Password is used once and never stored.",
};

export default function UnlockPage() {
  return <UnlockClient />;
}
