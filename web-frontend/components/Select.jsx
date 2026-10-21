"use client";

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";

/**
 * Extracts flat option items from React children (supports <option>, <optgroup>, and fragments).
 */
function extractOptions(children) {
  const items = [];

  React.Children.forEach(children, child => {
    if (!child) return;

    if (child.type === React.Fragment) {
      items.push(...extractOptions(child.props.children));
    } else if (child.type === "optgroup") {
      items.push({
        isGroup: true,
        label: child.props.label || "",
      });
      items.push(...extractOptions(child.props.children));
    } else if (child.type === "option" || child.props?.value !== undefined) {
      items.push({
        isGroup: false,
        value: child.props.value !== undefined ? String(child.props.value) : String(child.props.children || ""),
        label: child.props.children || child.props.label || String(child.props.value || ""),
        disabled: Boolean(child.props.disabled),
      });
    }
  });

  return items;
}

/**
 * Neo-Brutalist Select Component (Monochrome / Black & White)
 * Lightweight, accessible, full-control, zero external dependencies.
 * Uses React Portal to escape overflow clipping in tables, cards, and scroll containers.
 */
export default function Select({
  value,
  defaultValue,
  onChange,
  options: directOptions,
  children,
  name,
  id: propId,
  placeholder = "Select...",
  disabled = false,
  className = "",
  style = {},
  ariaLabel,
}) {
  const generatedId = useId();
  const selectId = propId || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, minWidth: 0, openUpwards: false });

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Normalize options list
  const options = React.useMemo(() => {
    if (Array.isArray(directOptions) && directOptions.length > 0) {
      return directOptions.map(opt => {
        if (typeof opt === "object" && opt !== null) {
          return {
            isGroup: Boolean(opt.isGroup),
            value: opt.value !== undefined ? String(opt.value) : "",
            label: opt.label !== undefined ? opt.label : String(opt.value || ""),
            disabled: Boolean(opt.disabled),
          };
        }
        return {
          isGroup: false,
          value: String(opt),
          label: String(opt),
          disabled: false,
        };
      });
    }
    return extractOptions(children);
  }, [directOptions, children]);

  // Current selected value
  const currentValue = value !== undefined ? String(value) : (defaultValue !== undefined ? String(defaultValue) : "");

  // Find currently selected option item
  const selectedOption = options.find(o => !o.isGroup && o.value === currentValue);
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || currentValue || "Select...");

  // Selectable items only (excluding group headers and disabled items)
  const selectableItems = React.useMemo(() => {
    return options.filter(o => !o.isGroup && !o.disabled);
  }, [options]);

  // Calculate portal viewport coordinates
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // If trigger is completely out of viewport view, close
    if (rect.bottom < 0 || rect.top > viewportHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow;

    // Horizontal bounds clamp
    let left = rect.left;
    const estimatedWidth = Math.max(rect.width, 180);
    if (left + estimatedWidth > viewportWidth - 12) {
      left = Math.max(8, viewportWidth - estimatedWidth - 12);
    }

    setMenuPosition({
      top: openUpwards ? rect.top - 4 : rect.bottom + 4,
      left,
      minWidth: rect.width,
      openUpwards,
    });
  }, []);

  // Update position on scroll/resize
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

  // Handle outside click & escape
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

  // Select an option
  const handleSelect = useCallback(
    item => {
      if (item.disabled || item.isGroup) return;

      if (onChange) {
        onChange({
          target: {
            name,
            id: selectId,
            value: item.value,
          },
        });
      }
      setIsOpen(false);
    },
    [onChange, name, selectId]
  );

  // Keyboard navigation
  const handleTriggerKeyDown = e => {
    if (disabled) return;

    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const currentIndex = selectableItems.findIndex(o => o.value === currentValue);
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const currentIndex = selectableItems.findIndex(o => o.value === currentValue);
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : selectableItems.length - 1);
      }
    }
  };

  const handleMenuKeyDown = e => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % selectableItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + selectableItems.length) % selectableItems.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < selectableItems.length) {
        handleSelect(selectableItems[highlightedIndex]);
      }
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const portalTarget = mounted && typeof document !== "undefined"
    ? ((triggerRef.current && triggerRef.current.closest("dialog")) || document.body)
    : null;

  // Dropdown floating menu rendered via React Portal
  const menuPortal = portalTarget && isOpen && createPortal(
    <div
      ref={menuRef}
      role="listbox"
      tabIndex={-1}
      onKeyDown={handleMenuKeyDown}
      className="neo-select-menu"
      style={{
        position: "fixed",
        top: menuPosition.openUpwards ? "auto" : `${menuPosition.top}px`,
        bottom: menuPosition.openUpwards ? `${window.innerHeight - menuPosition.top}px` : "auto",
        left: `${menuPosition.left}px`,
        minWidth: `${menuPosition.minWidth}px`,
        width: "max-content",
        maxWidth: "min(440px, calc(100vw - 24px))",
        maxHeight: "260px",
        overflowY: "auto",
        background: "#ffffff",
        border: "2px solid #000000",
        borderRadius: "6px",
        boxShadow: "3px 3px 0px #000000",
        padding: "4px",
        zIndex: 99999,
      }}
    >
      {options.map((item, idx) => {
        if (item.isGroup) {
          return (
            <div
              key={`group-${idx}`}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "10.5px",
                fontWeight: 900,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#52525b",
                padding: "8px 8px 4px",
                borderTop: idx > 0 ? "1.5px solid #000000" : "none",
                marginTop: idx > 0 ? "4px" : "0",
              }}
            >
              {item.label}
            </div>
          );
        }

        const isSelected = item.value === currentValue;
        const isSpecial = item.value.startsWith("__new_");

        return (
          <div
            key={`opt-${item.value}-${idx}`}
            role="option"
            aria-selected={isSelected}
            onClick={() => handleSelect(item)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              padding: "7px 10px",
              fontFamily: "var(--font-heading), var(--font-sans), sans-serif",
              fontSize: "13px",
              fontWeight: isSelected || isSpecial ? 800 : 600,
              color: isSpecial ? "#000000" : (isSelected ? "#000000" : "#18181b"),
              background: isSpecial ? "#f4f4f5" : (isSelected ? "#f4f4f5" : "#ffffff"),
              border: isSpecial ? "1.5px dashed #000000" : (isSelected ? "1.5px solid #000000" : "1.5px solid transparent"),
              borderRadius: "4px",
              cursor: item.disabled ? "not-allowed" : "pointer",
              opacity: item.disabled ? 0.35 : 1,
              margin: "2px 0",
              transition: "background 0.1s ease, color 0.1s ease",
              userSelect: "none",
            }}
            onMouseEnter={e => {
              if (!item.disabled) {
                e.currentTarget.style.background = "#000000";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.borderColor = "#000000";
              }
            }}
            onMouseLeave={e => {
              if (!item.disabled) {
                e.currentTarget.style.background = isSpecial ? "#f4f4f5" : (isSelected ? "#f4f4f5" : "#ffffff");
                e.currentTarget.style.color = isSpecial ? "#000000" : (isSelected ? "#000000" : "#18181b");
                e.currentTarget.style.borderColor = isSpecial ? "#000000" : (isSelected ? "#1.5px solid #000000" : "transparent");
              }
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.label}
            </span>
            {isSelected && (
              <span style={{ fontWeight: 900, fontSize: "14px", flexShrink: 0 }}>
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
      className={`neo-select-wrapper ${className}`}
      style={{
        position: "relative",
        display: "inline-block",
        width: style.width || (className.includes("full") ? "100%" : "100%"),
        ...style,
      }}
    >
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className="neo-select-trigger"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "8px 10px",
          fontSize: "13.5px",
          fontWeight: 700,
          fontFamily: "var(--font-heading), var(--font-sans), sans-serif",
          color: "#000000",
          background: "#ffffff",
          border: "2px solid #000000",
          borderRadius: "6px",
          boxShadow: isOpen ? "2.5px 2.5px 0px #000000" : "1.5px 1.5px 0px #000000",
          transform: isOpen ? "translate(-0.5px, -0.5px)" : "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
          textAlign: "left",
          outline: "none",
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {displayLabel}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000000"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
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
