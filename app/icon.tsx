import { ImageResponse } from "next/og";

// Favicon (browser tabs / search results). Wired automatically by Next.js as
// <link rel="icon">. Mirrors the brand "P" mark on the primary orange.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#C15F3C",
          color: "#FAFAF7",
          fontSize: 24,
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        P
      </div>
    ),
    { ...size }
  );
}
