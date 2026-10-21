"use client";

import React from "react";
import Link from "next/link";

/**
 * Lightweight, full-control Neo-Brutalist Sidebar Component
 * Follows Modern Neo-Brutalism (Monochrome / Black & White):
 * 2px solid black borders, hard shadows, tactile active press mechanics.
 */
export default function Sidebar({
  isOpen = true,
  onClose,
  currentUser,
  activeItem = "calc",
  onNavigate,
  onLogout,
  onInviteStaff,
}) {
  const navItems = [
    { id: "calc", label: "Calculator", icon: "📐", href: "#calc" },
    { id: "quotation", label: "Quotation & Rates", icon: "📑", href: "#quotation-section" },
    { id: "inventory", label: "Reel Inventory", icon: "📦", href: "#calc" },
    { id: "flutes", label: "Flute Profiles", icon: "〰️", href: "#calc" },
    { id: "tolerances", label: "Score Tolerances", icon: "📏", href: "#calc" },
    { id: "paper", label: "Paper Grades", icon: "📄", href: "#calc" },
  ];

  return (
    <aside
      className="neo-sidebar"
      style={{
        width: "260px",
        height: "100%",
        minHeight: "100vh",
        background: "#ffffff",
        borderRight: "2px solid #000000",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "3px 0px 0px #000000",
        fontFamily: "var(--font-heading), var(--font-sans), sans-serif",
      }}
    >
      {/* Sidebar Header */}
      <div>
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "2px solid #000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "24px",
                height: "24px",
                background: "conic-gradient(#000 0 12.5%, transparent 0 25%, #000 0 37.5%, transparent 0 50%, #000 0 62.5%, transparent 0 75%, #000 0 87.5%, transparent 0)",
                borderRadius: "50%",
                border: "2px solid #000000",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "#000000",
                textTransform: "uppercase",
              }}
            >
              BOXCALC
            </span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sidebar"
              style={{
                background: "transparent",
                border: "2px solid #000000",
                borderRadius: "4px",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "1px 1px 0px #000000",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav
          style={{
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {navItems.map(item => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate && onNavigate(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  fontSize: "13.5px",
                  fontWeight: 800,
                  borderRadius: "6px",
                  border: "2px solid #000000",
                  background: isActive ? "#000000" : "#ffffff",
                  color: isActive ? "#ffffff" : "#000000",
                  boxShadow: isActive ? "0px 0px 0px #000000" : "2px 2px 0px #000000",
                  transform: isActive ? "translate(2px, 2px)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.1s ease",
                  userSelect: "none",
                }}
              >
                <span style={{ fontSize: "15px" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div
        style={{
          padding: "16px 14px",
          borderTop: "2px solid #000000",
          background: "#f4f4f5",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {currentUser && (
          <div
            style={{
              padding: "10px 12px",
              background: "#ffffff",
              border: "2px solid #000000",
              borderRadius: "6px",
              boxShadow: "1.5px 1.5px 0px #000000",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#52525b" }}>
              Logged in as
            </div>
            <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#000000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser.name || currentUser.email || "Vendor Admin"}
            </div>
          </div>
        )}

        {onInviteStaff && (
          <button
            type="button"
            onClick={onInviteStaff}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: "12.5px",
              fontWeight: 800,
              background: "#ffffff",
              color: "#000000",
              border: "2px solid #000000",
              borderRadius: "6px",
              boxShadow: "1.5px 1.5px 0px #000000",
              cursor: "pointer",
            }}
          >
            + Invite Staff
          </button>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: "12.5px",
              fontWeight: 800,
              background: "#000000",
              color: "#ffffff",
              border: "2px solid #000000",
              borderRadius: "6px",
              boxShadow: "1.5px 1.5px 0px #000000",
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        )}
      </div>
    </aside>
  );
}
