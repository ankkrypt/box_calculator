"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

/**
 * Neo-Brutalist Persistent & Collapsible Left Sidebar Component
 * Docked on the left side, always visible, and smoothly collapsable.
 *
 * Props:
 * - user: Current user object ({ name, email, role }) or null
 * - activeItem: Current active nav item ID ('calc' | 'quotation' | 'inventory' | 'flutes' | 'tolerances' | 'paper')
 * - onNavigate: (itemId: string) => void
 * - onOpenOrderHistory: () => void
 * - onOpenQuotation: () => void
 * - onInviteStaff: () => void
 * - onOpenProfile: () => void
 * - onLogout: () => void
 * - collapsed: Optional controlled collapse state
 * - onToggleCollapse: Optional callback when collapse is toggled
 */
export default function Sidebar({
  user,
  activeItem = "calc",
  onNavigate,
  onOpenOrderHistory,
  onOpenQuotation,
  onInviteStaff,
  onManageStaff,
  onOpenProfile,
  onLogout,
  collapsed: controlledCollapsed,
  onToggleCollapse,
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bxcalc_sidebar_collapsed");
      if (saved !== null && controlledCollapsed === undefined) {
        setInternalCollapsed(saved === "true");
      }
    } catch {
      // ignore localStorage errors in private browsing
    }
  }, [controlledCollapsed]);

  const handleToggle = () => {
    const next = !isCollapsed;
    if (onToggleCollapse) {
      onToggleCollapse(next);
    } else {
      setInternalCollapsed(next);
      try {
        localStorage.setItem("bxcalc_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
    }
  };

  const isVendor = user?.role === "vendor";

  const navItems = [
    { id: "calc", label: "Calculator", icon: "📐", desc: "Box dimensions & board specs" },
    { id: "quotation", label: "Quotation & Rates", icon: "📑", desc: "Pricing, margins & taxes" },
    { id: "inventory", label: "Reel Inventory", icon: "📦", desc: "Paper stock & reel widths" },
    { id: "flutes", label: "Flute Profiles", icon: "〰️", desc: "Take-up factor & thickness" },
    { id: "tolerances", label: "Score Tolerances", icon: "📏", desc: "Creasing & slot allowances" },
    { id: "paper", label: "Paper Grades", icon: "📄", desc: "BF & GSM specifications" },
  ];

  return (
    <aside
      className={`neo-sidebar ${isCollapsed ? "collapsed" : ""}`}
      aria-label="Main Navigation Sidebar"
    >
      {/* Top Section: Brand + User Info + Nav */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Brand Header */}
        {isCollapsed ? (
          <div
            style={{
              padding: "14px 8px 12px",
              borderBottom: "2px solid #000000",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              background: "#ffffff",
            }}
          >
            <span
              style={{
                width: "24px",
                height: "24px",
                background: "conic-gradient(#000 0 12.5%, transparent 0 25%, #000 0 37.5%, transparent 0 50%, #000 0 62.5%, transparent 0 75%, #000 0 87.5%, transparent 0)",
                borderRadius: "50%",
                border: "2px solid #000000",
                display: "inline-block",
                flexShrink: 0,
              }}
              title="BoxCalc Corrugated Suite"
            />
            <button
              type="button"
              id="sidebar-toggle-btn"
              onClick={handleToggle}
              className="neo-sidebar-toggle-btn"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              ▶
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "2px solid #000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#ffffff",
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
                  flexShrink: 0,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontFamily: "var(--font-heading), sans-serif",
                    fontSize: "17px",
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                    color: "#000000",
                    lineHeight: "1.1",
                    textTransform: "uppercase",
                  }}
                >
                  BOXCALC
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "9.5px",
                    fontWeight: 700,
                    color: "#71717a",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Corrugated Suite
                </span>
              </div>
            </div>
            <button
              type="button"
              id="sidebar-toggle-btn"
              onClick={handleToggle}
              className="neo-sidebar-toggle-btn"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              ◀
            </button>
          </div>
        )}

        {/* User Profile Card */}
        <div
          style={{
            padding: isCollapsed ? "10px 8px" : "12px 14px",
            borderBottom: "2px solid #000000",
            background: "#fafafa",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {user ? (
            isCollapsed ? (
              <button
                type="button"
                id="sidebar-user-profile-card"
                onClick={onOpenProfile}
                className="neo-sidebar-user-card-collapsed"
                title={`${user.name || "User"} (${isVendor ? "Vendor Admin" : "Staff"})\n${user.email || ""}\nClick to view and edit profile`}
                aria-label="User profile, click to view and edit"
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "4px",
                    background: isVendor ? "#000000" : "#52525b",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "13.5px",
                    fontFamily: "var(--font-heading), sans-serif",
                    border: "1.5px solid #000000",
                  }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : (isVendor ? "V" : "S")}
                </div>
              </button>
            ) : (
              <button
                type="button"
                id="sidebar-user-profile-card"
                onClick={onOpenProfile}
                className="neo-sidebar-user-card"
                title="Click to view and edit profile"
                aria-label="User profile, click to view and edit"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      background: isVendor ? "#000000" : "#52525b",
                      color: "#ffffff",
                      display: "inline-block",
                    }}
                  >
                    {isVendor ? "Vendor Admin" : "Staff"}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#71717a",
                      lineHeight: 1,
                    }}
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 800,
                    color: "#000000",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: "1.25",
                  }}
                  title={user.name || "Vendor User"}
                >
                  {user.name || "Vendor User"}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#71717a",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontFamily: "var(--font-mono), monospace",
                    marginTop: "2px",
                  }}
                  title={user.email}
                >
                  {user.email || ""}
                </div>
              </button>
            )
          ) : (
            isCollapsed ? (
              <Link
                href="/auth"
                className="neo-sidebar-user-card-collapsed"
                title="Log In / Register"
                aria-label="Log In / Register"
                style={{ textDecoration: "none" }}
              >
                <span style={{ fontSize: "16px" }}>🔑</span>
              </Link>
            ) : (
              <div
                style={{
                  width: "100%",
                  background: "#ffffff",
                  border: "2px solid #000000",
                  borderRadius: "5px",
                  padding: "10px",
                  boxShadow: "2px 2px 0px #000000",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#52525b", marginBottom: "8px" }}>
                  Not logged in
                </div>
                <Link
                  href="/auth"
                  style={{
                    display: "block",
                    padding: "6px 12px",
                    background: "#000000",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 800,
                    borderRadius: "4px",
                    border: "2px solid #000000",
                    textDecoration: "none",
                    boxShadow: "1.5px 1.5px 0px rgba(0,0,0,0.5)",
                  }}
                >
                  Log In / Register
                </Link>
              </div>
            )
          )}
        </div>

        {/* Navigation Links */}
        <div style={{ padding: isCollapsed ? "10px 8px 6px" : "14px 12px 6px" }}>
          {!isCollapsed ? (
            <div
              style={{
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                color: "#a1a1aa",
                textTransform: "uppercase",
                paddingLeft: "4px",
                marginBottom: "8px",
              }}
            >
              Navigation
            </div>
          ) : (
            <div style={{ height: "1px", background: "#e4e4e7", margin: "2px 4px 8px" }} />
          )}
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              border: "none",
              padding: 0,
              height: "auto",
              position: "static",
              background: "transparent",
              alignItems: isCollapsed ? "center" : "stretch",
            }}
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                id={`sidebar-nav-${item.id}`}
                onClick={() => onNavigate && onNavigate(item.id)}
                className="neo-sidebar-nav-btn"
                title={`${item.label} – ${item.desc}`}
                aria-label={item.label}
                  style={isCollapsed ? {
                    width: "44px",
                    height: "44px",
                    padding: 0,
                    justifyContent: "center",
                  } : undefined}
                >
                  <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                  {!isCollapsed && (
                    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.label}
                    </span>
                  )}
                </button>
              ))}
          </nav>
        </div>

        {/* Quick Actions / Shortcuts */}
        <div style={{ padding: isCollapsed ? "8px 8px 14px" : "10px 12px 14px" }}>
          {!isCollapsed ? (
            <div
              style={{
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                color: "#a1a1aa",
                textTransform: "uppercase",
                paddingLeft: "4px",
                marginBottom: "8px",
              }}
            >
              Workspace Actions
            </div>
          ) : (
            <div style={{ height: "1px", background: "#e4e4e7", margin: "2px 4px 8px" }} />
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              alignItems: isCollapsed ? "center" : "stretch",
            }}
          >
            {onOpenOrderHistory && (
              <button
                type="button"
                id="sidebar-action-order-history"
                onClick={onOpenOrderHistory}
                className="neo-sidebar-action-btn"
                title="Order History – View previous saved box orders"
                aria-label="Order History"
                style={isCollapsed ? {
                  width: "44px",
                  height: "44px",
                  padding: 0,
                  justifyContent: "center",
                } : undefined}
              >
                <span style={{ fontSize: "15px", flexShrink: 0 }}>📜</span>
                {!isCollapsed && <span>Order History</span>}
              </button>
            )}

            {isVendor && onOpenQuotation && (
              <button
                type="button"
                id="sidebar-action-quotation-settings"
                onClick={onOpenQuotation}
                className="neo-sidebar-action-btn"
                title="Quotation Settings – Edit conversion rates, margins and GST"
                aria-label="Quotation Settings"
                style={isCollapsed ? {
                  width: "44px",
                  height: "44px",
                  padding: 0,
                  justifyContent: "center",
                } : undefined}
              >
                <span style={{ fontSize: "15px", flexShrink: 0 }}>⚙️</span>
                {!isCollapsed && <span>Quotation Settings</span>}
              </button>
            )}

            {isVendor && (onManageStaff || onInviteStaff) && (
              <button
                type="button"
                id="sidebar-action-manage-staff"
                onClick={onManageStaff || onInviteStaff}
                className="neo-sidebar-action-btn"
                title="Manage Staff – Invite and manage team members"
                aria-label="Manage Staff"
                style={isCollapsed ? {
                  width: "44px",
                  height: "44px",
                  padding: 0,
                  justifyContent: "center",
                } : undefined}
              >
                <span style={{ fontSize: "15px", flexShrink: 0 }}>👥</span>
                {!isCollapsed && <span>Manage Staff</span>}
              </button>
            )}

            {onOpenProfile && (
              <button
                type="button"
                id="sidebar-action-profile"
                onClick={onOpenProfile}
                className="neo-sidebar-action-btn"
                title="My Profile – View and update profile"
                aria-label="My Profile"
                style={isCollapsed ? {
                  width: "44px",
                  height: "44px",
                  padding: 0,
                  justifyContent: "center",
                } : undefined}
              >
                <span style={{ fontSize: "15px", flexShrink: 0 }}>👤</span>
                {!isCollapsed && <span>My Profile</span>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div
        style={{
          padding: isCollapsed ? "12px 8px 14px" : "14px 14px 16px",
          borderTop: "2px solid #000000",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: isCollapsed ? "center" : "stretch",
        }}
      >
        {user ? (
          <button
            type="button"
            id="sidebar-btn-logout"
            onClick={onLogout}
            className="neo-sidebar-logout-btn"
            title={isCollapsed ? "Log out" : undefined}
            aria-label="Log out"
            style={isCollapsed ? {
              width: "44px",
              height: "44px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            } : undefined}
          >
            {isCollapsed ? "🚪" : "Log out"}
          </button>
        ) : (
          <Link
            href="/auth"
            className="neo-sidebar-logout-btn"
            style={{
              textDecoration: "none",
              display: "block",
              ...(isCollapsed ? {
                width: "44px",
                height: "44px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
              } : {}),
            }}
            title={isCollapsed ? "Sign In" : undefined}
            aria-label="Sign In"
          >
            {isCollapsed ? "🔑" : "Sign In"}
          </Link>
        )}
      </div>
    </aside>
  );
}
