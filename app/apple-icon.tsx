import { ImageResponse } from "next/og";

// Apple touch icon (iOS Add to Home Screen). Wired automatically as
// <link rel="apple-touch-icon">. Full-bleed background (iOS rounds corners
// itself), so no border radius here.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        P
      </div>
    ),
    { ...size }
  );
}
