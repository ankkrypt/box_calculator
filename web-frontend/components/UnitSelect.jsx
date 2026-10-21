"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const DEFAULT_UNITS = [
  { value: "mm", label: "mm" },
  { value: "cm", label: "cm" },
  { value: "inch", label: "inch" },
];

/**
 * Neo-Brutalist Unit Dropdown Selector
 * Replaces unstyled native selects and buttons with a sleek, multi-unit dropdown.
 * Uses React Portal to guarantee the dropdown is never clipped by parent overflow containers.
 */
export default function UnitSelect({
  unit = "mm",
  onChange,
  units = DEFAULT_UNITS,
  label = "Select unit",
  className = "",
  inline = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, openUpwards: false });

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isInline = inline || className.includes("unitpick");
  const currentLabel = units.find(u => u.value === unit)?.label || unit;

  // Calculate viewport coordinates for floating menu
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    if (rect.bottom < 0 || rect.top > viewportHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < 140 && spaceAbove > spaceBelow;

    const menuWidth = 85;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8;
    }

    setMenuPosition({
      top: openUpwards ? rect.top - 4 : rect.bottom + 4,
      left,
      openUpwards,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = e => {
      const inTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inTrigger && !inMenu) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = e => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = val => {
    if (onChange) {
      onChange(val);
    }
    setIsOpen(false);
  };

  const portalTarget = mounted && typeof document !== "undefined"
    ? ((triggerRef.current && triggerRef.current.closest("dialog")) || document.body)
    : null;

  const menuPortal = portalTarget && isOpen && createPortal(
    <div
      ref={menuRef}
      role="listbox"
      className="unit-dropdown-menu"
      style={{
        position: "fixed",
        top: menuPosition.openUpwards ? "auto" : `${menuPosition.top}px`,
        bottom: menuPosition.openUpwards ? `${window.innerHeight - menuPosition.top}px` : "auto",
        left: `${menuPosition.left}px`,
        minWidth: "85px",
        background: "#ffffff",
        border: "2px solid #000000",
        borderRadius: "6px",
        boxShadow: "3px 3px 0px #000000",
        padding: "3px",
        zIndex: 99999,
      }}
    >
      {units.map(item => {
        const isSelected = item.value === unit;
        return (
          <div
            key={item.value}
            role="option"
            aria-selected={isSelected}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect(item.value);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "6px",
              padding: "5px 8px",
              fontFamily: "var(--font-heading)",
              fontSize: "11.5px",
              fontWeight: isSelected ? 900 : 700,
              textTransform: "uppercase",
              color: isSelected ? "#000000" : "#18181b",
              background: isSelected ? "#f4f4f5" : "#ffffff",
              border: isSelected ? "1.5px solid #000000" : "1.5px solid transparent",
              borderRadius: "4px",
              cursor: "pointer",
              margin: "2px 0",
              userSelect: "none",
              transition: "all 0.1s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#000000";
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.borderColor = "#000000";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isSelected ? "#f4f4f5" : "#ffffff";
              e.currentTarget.style.color = isSelected ? "#000000" : "#18181b";
              e.currentTarget.style.borderColor = isSelected ? "#000000" : "transparent";
            }}
          >
            <span>{item.label}</span>
            {isSelected && (
              <span style={{ fontWeight: 900, fontSize: "11px" }}>
                ✓
              </span>
            )}
          </div>
        );
      })}
    </div>,
    portalTarget
  );

  return (
    <div
      ref={containerRef}
      className={`unit-dropdown-wrapper ${isInline ? "inline" : "embedded"} ${className}`}
      style={{
        position: isInline ? "relative" : "absolute",
        right: isInline ? "auto" : "5px",
        top: isInline ? "auto" : "50%",
        transform: isInline ? "none" : "translateY(-50%)",
        display: "inline-flex",
        alignItems: "center",
        zIndex: 5,
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className="unit-dropdown-trigger"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          height: isInline ? "22px" : "28px",
          padding: isInline ? "0 6px" : "0 8px",
          background: isOpen ? "#000000" : "#f4f4f5",
          color: isOpen ? "#ffffff" : "#000000",
          border: "1.5px solid #000000",
          borderRadius: "4px",
          boxShadow: isOpen ? "0px 0px 0px #000000" : "1px 1px 0px #000000",
          transform: isOpen ? "translate(1px, 1px)" : "none",
          fontFamily: "var(--font-heading)",
          fontSize: isInline ? "10.5px" : "11.5px",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          cursor: "pointer",
          userSelect: "none",
          lineHeight: 1,
          outline: "none",
          transition: "background 0.1s ease, color 0.1s ease",
        }}
      >
        <span>{currentLabel}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {menuPortal}
    </div>
  );
}
