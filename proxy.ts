import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File too large: 6 MB limit" },
        { status: 413 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
