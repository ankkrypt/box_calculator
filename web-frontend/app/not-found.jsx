import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #0b0f19)",
        color: "var(--fg, #e2e8f0)",
        fontFamily: "system-ui, sans-serif",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "48px", fontWeight: "700", marginBottom: "8px" }}>404</h1>
      <p style={{ fontSize: "16px", color: "var(--sub, #94a3b8)", marginBottom: "24px" }}>
        Page not found
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "8px 16px",
          background: "var(--pri, #38bdf8)",
          color: "#0b0f19",
          borderRadius: "6px",
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "14px",
        }}
      >
        Return Home
      </Link>
    </div>
  );
}
