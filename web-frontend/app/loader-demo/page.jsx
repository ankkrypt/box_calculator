"use client";

import React from "react";
import HourglassLoader from "../HourglassLoader";

export default function LoaderDemoPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg, #f4f5f7)",
        color: "var(--fg, #18181b)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "32px",
        padding: "40px 20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>
          Black Liquid Hourglass Loader
        </h1>
        <p style={{ color: "var(--mute, #64748b)", fontSize: "14px", margin: 0 }}>
          Glossy black liquid • Gravity fall • Slower continuous clockwise rotation
        </p>
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid var(--line, #e2e8f0)",
          borderRadius: "16px",
          padding: "48px 64px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <HourglassLoader size={60} label="Loading BoxCalc…" />
      </div>

      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: "12px",
            padding: "24px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HourglassLoader size={44} label="Calculating sheet size…" />
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: "12px",
            padding: "24px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HourglassLoader size={36} label="Fetching inventory…" />
        </div>
      </div>
    </div>
  );
}
