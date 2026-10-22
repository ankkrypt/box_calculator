"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

/**
 * Sidebar Open / Expand Icon (standard panel-left-open SVG)
 */
function SidebarOpenIcon({ size = 15, strokeWidth = 2.2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m14 9 3 3-3 3" />
    </svg>
  );
}

/**
 * Sidebar Close / Collapse Icon (standard panel-left-close SVG)
 */
function SidebarCloseIcon({ size = 15, strokeWidth = 2.2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </svg>
  );
}

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
  const [isHovered, setIsHovered] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const isEffectiveCollapsed = isCollapsed && !isHovered;

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
    setIsHovered(false);
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
    <div className={`neo-sidebar-wrapper ${isCollapsed ? "collapsed" : ""}`}>
      <aside
        className={`neo-sidebar ${isEffectiveCollapsed ? "collapsed" : ""} ${isCollapsed && isHovered ? "hover-expanded" : ""}`}
        aria-label="Main Navigation Sidebar"
        onMouseEnter={() => {
          if (isCollapsed) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (isHovered) setIsHovered(false);
        }}
      >
      {/* Top Section: Brand + User Info + Nav */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Brand Header */}
        <div
          style={{
            height: "58px",
            padding: isEffectiveCollapsed ? "0 8px" : "0 14px",
            borderBottom: "2px solid #000000",
            display: "flex",
            alignItems: "center",
            justifyContent: isEffectiveCollapsed ? "center" : "space-between",
            background: "#ffffff",
            boxSizing: "border-box",
            flexShrink: 0,
          }}
        >
          {isEffectiveCollapsed ? (
            <button
              type="button"
              id="sidebar-toggle-btn"
              onClick={handleToggle}
              className="neo-sidebar-toggle-btn"
              style={{
                width: "38px",
                height: "38px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                background: "#ffffff",
              }}
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <SidebarOpenIcon size={18} strokeWidth={2.4} />
            </button>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    background: "conic-gradient(#000 0 12.5%, transparent 0 25%, #000 0 37.5%, transparent 0 50%, #000 0 62.5%, transparent 0 75%, #000 0 87.5%, transparent 0)",
                    borderRadius: "50%",
                    border: "1.5px solid #000000",
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
                title={isCollapsed ? "Pin sidebar expanded" : "Collapse sidebar"}
                aria-label={isCollapsed ? "Pin sidebar expanded" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <SidebarOpenIcon size={14} strokeWidth={2.2} />
                ) : (
                  <SidebarCloseIcon size={14} strokeWidth={2.2} />
                )}
              </button>
            </>
          )}
        </div>

        {/* User Profile Card */}
        <div
          style={{
            height: "56px",
            padding: "8px 12px",
            borderBottom: "2px solid #000000",
            background: "#fafafa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            flexShrink: 0,
          }}
        >
          {user ? (
            isEffectiveCollapsed ? (
              <button
                type="button"
                id="sidebar-user-profile-card"
                onClick={onOpenProfile}
                className="neo-sidebar-user-card-collapsed"
                style={{ background: isVendor ? "#000000" : "#52525b" }}
                title={`${user.name || "User"} (${isVendor ? "Vendor Admin" : "Staff"})\n${user.email || ""}\nClick to view and edit profile`}
                aria-label="User profile, click to view and edit"
              >
                {user.name ? user.name.charAt(0).toUpperCase() : (isVendor ? "V" : "S")}
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
                    width: "26px",
                    height: "26px",
                    borderRadius: "3px",
                    background: isVendor ? "#000000" : "#52525b",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "12px",
                    fontFamily: "var(--font-heading), sans-serif",
                    border: "1.5px solid #000000",
                    flexShrink: 0,
                  }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : (isVendor ? "V" : "S")}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 800,
                        color: "#000000",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1.15,
                      }}
                      title={user.name || "Vendor User"}
                    >
                      {user.name || "Vendor User"}
                    </span>
                    <span
                      style={{
                        fontSize: "8.5px",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        padding: "1px 4px",
                        borderRadius: "2px",
                        background: isVendor ? "#000000" : "#52525b",
                        color: "#ffffff",
                        display: "inline-block",
                        lineHeight: 1.1,
                        flexShrink: 0,
                      }}
                    >
                      {isVendor ? "Admin" : "Staff"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#71717a",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontFamily: "var(--font-mono), monospace",
                      lineHeight: 1.15,
                      marginTop: "1px",
                    }}
                    title={user.email}
                  >
                    {user.email || ""}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#a1a1aa",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>
            )
          ) : (
            isEffectiveCollapsed ? (
              <Link
                href="/auth"
                className="neo-sidebar-user-card-collapsed"
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  textDecoration: "none",
                }}
                title="Log In / Register"
                aria-label="Log In / Register"
              >
                <span style={{ fontSize: "16px" }}>🔑</span>
              </Link>
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "40px",
                  background: "#ffffff",
                  border: "2px solid #000000",
                  borderRadius: "4px",
                  padding: "0 8px",
                  boxShadow: "2px 2px 0px #000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#52525b" }}>
                  Not logged in
                </div>
                <Link
                  href="/auth"
                  style={{
                    display: "inline-block",
                    padding: "4px 8px",
                    background: "#000000",
                    color: "#ffffff",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    borderRadius: "3px",
                    border: "1.5px solid #000000",
                    textDecoration: "none",
                    boxShadow: "1px 1px 0px rgba(0,0,0,0.5)",
                    lineHeight: "1.2",
                  }}
                >
                  Log In
                </Link>
              </div>
            )
          )}
        </div>

        {/* Navigation Links */}
        <div style={{ padding: "10px 12px 6px" }}>
          <div
            style={{
              height: "18px",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            {!isEffectiveCollapsed ? (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  color: "#a1a1aa",
                  textTransform: "uppercase",
                  paddingLeft: "4px",
                }}
              >
                Navigation
              </span>
            ) : (
              <div style={{ width: "100%", height: "2px", background: "#e4e4e7" }} />
            )}
          </div>
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
              alignItems: isEffectiveCollapsed ? "center" : "stretch",
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
                style={isEffectiveCollapsed ? {
                  width: "40px",
                  height: "40px",
                  padding: 0,
                  justifyContent: "center",
                } : {
                  height: "40px",
                }}
              >
                <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                {!isEffectiveCollapsed && (
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.label}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Quick Actions / Shortcuts */}
        <div style={{ padding: "8px 12px 14px" }}>
          <div
            style={{
              height: "18px",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            {!isEffectiveCollapsed ? (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  color: "#a1a1aa",
                  textTransform: "uppercase",
                  paddingLeft: "4px",
                }}
              >
                Workspace Actions
              </span>
            ) : (
              <div style={{ width: "100%", height: "2px", background: "#e4e4e7" }} />
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              alignItems: isEffectiveCollapsed ? "center" : "stretch",
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
                style={isEffectiveCollapsed ? {
                  width: "38px",
                  height: "38px",
                  padding: 0,
                  justifyContent: "center",
                } : {
                  height: "38px",
                }}
              >
                <span style={{ fontSize: "15px", flexShrink: 0 }}>📜</span>
                {!isEffectiveCollapsed && <span>Order History</span>}
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
                style={isEffectiveCollapsed ? {
                  width: "38px",
                  height: "38px",
                  padding: 0,
                  justifyContent: "center",
                } : {
                  height: "38px",
                }}
              >
                <span style={{ fontSize: "15px", flexShrink: 0 }}>⚙️</span>
                {!isEffectiveCollapsed && <span>Quotation Settings</span>}
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
                style={isEffectiveCollapsed ? {
                  width: "38px",
                  height: "38px",
                  padding: 0,
                  justifyContent: "center",
                } : {
                  height: "38px",
                }}
              >
                <span style={{ fontSize: "15px", flexShrink: 0 }}>👥</span>
                {!isEffectiveCollapsed && <span>Manage Staff</span>}
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
                style={isEffectiveCollapsed ? {
                  width: "38px",
                  height: "38px",
                  padding: 0,
                  justifyContent: "center",
                } : {
                  height: "38px",
                }}
              >
                <span style={{ fontSize: "15px", flexShrink: 0 }}>👤</span>
                {!isEffectiveCollapsed && <span>My Profile</span>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div
        style={{
          padding: "12px 12px 14px",
          borderTop: "2px solid #000000",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: isEffectiveCollapsed ? "center" : "stretch",
          flexShrink: 0,
        }}
      >
        {user ? (
          <button
            type="button"
            id="sidebar-btn-logout"
            onClick={onLogout}
            className="neo-sidebar-logout-btn"
            title={isEffectiveCollapsed ? "Log out" : undefined}
            aria-label="Log out"
            style={isEffectiveCollapsed ? {
              width: "40px",
              height: "40px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            } : {
              height: "40px",
            }}
          >
            {isEffectiveCollapsed ? "🚪" : "Log out"}
          </button>
        ) : (
          <Link
            href="/auth"
            className="neo-sidebar-logout-btn"
            style={{
              textDecoration: "none",
              height: "40px",
              ...(isEffectiveCollapsed ? {
                width: "40px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
              } : {}),
            }}
            title={isEffectiveCollapsed ? "Sign In" : undefined}
            aria-label="Sign In"
          >
            {isEffectiveCollapsed ? "🔑" : "Sign In"}
          </Link>
        )}
      </div>
    </aside>
  </div>
  );
}
