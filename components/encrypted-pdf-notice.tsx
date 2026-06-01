import Link from "next/link";
import { TOOL_ROUTES } from "@/lib/constants";

type EncryptedPdfNoticeProps = {
  className?: string;
};

/** Shown when preflight detects a password-protected PDF. */
export function EncryptedPdfNotice({ className }: EncryptedPdfNoticeProps) {
  return (
    <p className={className}>
      This PDF is password protected.{" "}
      <Link
        href={TOOL_ROUTES.unlock}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Unlock it here
      </Link>{" "}
      if you own the file, then try again.
    </p>
  );
}
