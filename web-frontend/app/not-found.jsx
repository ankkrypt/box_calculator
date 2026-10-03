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
        background: "var(--bg, #f4f5f7)",
        color: "var(--fg, #18181b)",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "48px", fontWeight: "700", margin: "0 0 8px 0" }}>404</h1>
      <p style={{ fontSize: "15px", color: "var(--mute, #64748b)", margin: "0 0 24px 0" }}>
        Page not found
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "8px 18px",
          background: "var(--btn, #18181b)",
          color: "#ffffff",
          borderRadius: "6px",
          textDecoration: "none",
          fontWeight: "500",
          fontSize: "13px",
        }}
      >
        Return to Calculator
      </Link>
    </div>
  );
}
