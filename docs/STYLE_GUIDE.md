# BoxCalc UI Design System & Style Guide
## Modern Neo-Brutalism (Monochrome / Black & White)

This document is the official design specification for the **BoxCalc** web application. Any AI assistant or developer building, updating, or reviewing user interfaces must strictly adhere to this style guide to ensure a consistent, ultra-scannable, tactile modern Neo-Brutalist aesthetic across the entire website.

---

## 1. Core Principles & Philosophy

1. **High Contrast & Monochrome**: Built strictly on pure black (`#000000`) and stark white (`#ffffff`), with crisp neutral grays (`#52525b`, `#f4f4f5`) for subtle scaffolding and hover feedback.
2. **Tactile & Physical**:
   - Signature **2px solid black borders** (`border: 2px solid #000000`) across all cards, buttons, inputs, tables, tabs, and modals.
   - **Hard offset drop shadows** with zero blur (`2px 2px 0px #000000`, `3px 3px 0px #000000`, `6px 6px 0px #000000`).
   - **Tactile Click Mechanics**: Interactive elements physically shift down and right on click (`transform: translate(2px, 2px); box-shadow: 0px 0px 0px #000000;`).
3. **Strict 3-Tier Typography System**:
   - **Space Grotesk** (`--font-heading`): Bold headings, labels, button text, tabs, navigation, badges, and uppercase micro-labels.
   - **Plus Jakarta Sans** (`--font-sans`): Highly legible body copy and form input values.
   - **JetBrains Mono** (`--font-mono`): Industrial packaging metrics, numbers, dimensions, weights, rates, and costs (`font-variant-numeric: tabular-nums`).
4. **React Portal Pattern for Dropdowns**:
   - All custom select menus and unit dropdowns (`Select.jsx`, `UnitSelect.jsx`) must be rendered using **React Portals** (`createPortal`) targeting the active `closest("dialog") || document.body`.
   - This ensures dropdown menus are **never clipped or hidden** by parent scrollbars or overflow containers (`overflow: hidden`, `overflow-x: auto`, tables, cards, dialogs).
5. **Multi-Unit Input Support**:
   - Dimension inputs support `mm`, `cm`, and `inch` via embedded unit dropdowns.
   - **Strict Backend Normalization Rule**: Display units may vary on the frontend, but **all payloads sent to backend APIs must strictly be normalized to millimeters (`mm`), kilograms (`kg`), Indian Rupees (`₹`), and integer quantities** (per `docs/RULES.md`).
6. **JavaScript Only**: All frontend code must strictly use `.js` and `.jsx` only (no TypeScript allowed, per `docs/RULES.md`).

---

## 2. Color Palette & CSS Tokens

All styling references these CSS custom properties defined in `:root` inside `web-frontend/app/globals.css`:

| Token | Value | Semantic Role |
| :--- | :--- | :--- |
| `--bg` | `#f8f9fa` | Clean, stark canvas background |
| `--surface` | `#ffffff` | Primary elevated surfaces: cards, modals, navigation bar, sidebar |
| `--fg` | `#000000` | Pure black primary text, titles, headings, icons, borders |
| `--mute` | `#52525b` | Secondary text, input sub-labels, subtle notes |
| `--line` | `#000000` | Signature 2px solid black borders |
| `--line-soft` | `#000000` | Structural table borders and dividers |
| `--soft` | `#f4f4f5` | Pill backgrounds, inactive tabs, row hover highlights |
| `--btn` | `#000000` | Primary solid black action button background |
| `--btnfg` | `#ffffff` | Primary button text |
| `--accent` | `#000000` | High-contrast monochrome focus outlines and accents |
| `--shadow` | `3px 3px 0px #000000` | Standard Neo-Brutalist hard shadow for cards and tables |
| `--shadow-sm` | `2px 2px 0px #000000` | Hard shadow for buttons, inputs, tags, and subtabs |
| `--shadow-lg` | `5px 5px 0px #000000` | Prominent hard shadow for floating elements |
| **Modal Shadow** | `6px 6px 0px #000000` | Thick hard shadow for `<dialog>` modals |
| **Drawer Shadow** | `-4px 0px 0px #000000`| Left-projected hard shadow for slide-out navigation drawer |

### Status Accents
- **Confirmed / Success Badge**: `#ffffff` background with 2px black border, `#000000` text, green dot `#16a34a` or solid black badge.
- **Danger / Delete**: `#ffffff` background with `#dc2626` text and 2px black border; or solid black with red hover state `#dc2626`.
- **Validation Error Highlight & Shake**: Solid 2px black border with offset red shadow `3px 3px 0px #ef4444` and horizontal shake animation (`.input-highlight-error`).

---

## 3. Typography & Hierarchy

### Google Fonts Import
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=Space+Grotesk:wght@600;700;800;900&display=swap" rel="stylesheet" />
```

### CSS Variables
```css
--font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
--font-heading: 'Space Grotesk', 'Plus Jakarta Sans', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Hierarchy Specifications

| Role | Font Family | Size | Weight | Case / Tracking | Example Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Logo / Top Nav** | `--font-heading` | `19px` | `900` | UPPERCASE (`-0.02em`) | Navigation bar title |
| **Hero Title (`h1`)** | `--font-heading` | `24px` | `900` | UPPERCASE (`-0.02em`) | Main page title |
| **Section Header (`h2`)** | `--font-heading` | `18px` | `800` | UPPERCASE (`-0.01em`) | Card & section headings |
| **Card Header (`h3`)** | `--font-heading` | `15px` | `800` | UPPERCASE (`+0.02em`) | Subsection headings |
| **Form Label (`label`)** | `--font-heading` | `11.5px` | `800` | UPPERCASE (`+0.04em`) | Input and select field labels |
| **Body Text** | `--font-sans` | `14px` | `500` / `600` | Normal sentence case | Descriptions, instructions |
| **Form Inputs** | `--font-sans` | `13.5px`| `700` | Normal sentence case | Text inputs, select triggers |
| **Metric / Number Display**| `--font-mono` | `26px` – `30px`| `900` | `tabular-nums` (`-0.04em`)| Big summary numbers (`.big`) |
| **Table Header (`th`)** | `--font-heading` | `11.5px` | `800` | UPPERCASE (`+0.05em`) | Data table columns |
| **Table Data Numbers** | `--font-mono` | `13px` – `14px`| `700` / `800` | `tabular-nums` | GSM, weights, dimensions, rates |
| **Tabs & Pill Buttons** | `--font-heading` | `13px` | `800` | Normal title case | Tab selectors, subtab pills |

---

## 4. Component Specifications

### 4.1 Buttons (Tactile Neo-Brutalist)

Buttons have a physical, mechanical feel. On hover, they elevate slightly with an expanded shadow; on active press, they push down and right into the canvas.

```css
button, .btn {
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 700;
  border-radius: 6px;
  padding: 8px 16px;
  border: 2px solid #000000;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  box-shadow: 2px 2px 0px #000000;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.15s ease;
  user-select: none;
}

/* Hover Elevation */
button:hover:not(:disabled),
.btn:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px #000000;
  background: #ffffff;
}

/* Physical Active Press */
button:active:not(:disabled),
.btn:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 0px 0px 0px #000000;
}

/* Primary Button (Solid Black) */
.pri {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}
.pri:hover:not(:disabled) {
  background: #18181b;
  color: #ffffff;
}

/* Danger Button */
button.danger {
  color: #dc2626;
  border-color: #000000;
  background: #ffffff;
}
button.danger:hover:not(:disabled) {
  background: #fee2e2;
}

button.danger.solid {
  background: #000000;
  color: #ffffff;
}
button.danger.solid:hover:not(:disabled) {
  background: #dc2626;
}
```

### 4.2 Cards & Containers (`.card`)

```css
.card {
  background: var(--surface);
  border: 2px solid #000000;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 3px 3px 0px #000000;
}
```

### 4.3 Form Inputs & Embedded Units

Inputs feature 2px solid black borders, subtle 1.5px hard shadows, and monospaced digits for dimensions:

```css
input, textarea {
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 700;
  color: #000000;
  background: var(--surface);
  border: 2px solid #000000;
  border-radius: 6px;
  padding: 8px 10px;
  width: 100%;
  outline: none;
  box-shadow: 1.5px 1.5px 0px #000000;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

input:focus, textarea:focus {
  border-color: #000000;
  box-shadow: 2.5px 2.5px 0px #000000;
  transform: translate(-0.5px, -0.5px);
}

/* Embedded Unit Container */
.unit.has-select {
  position: relative;
  display: block;
}
.unit.has-select input {
  padding-right: 76px;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
}
```

### 4.4 Custom Select & UnitSelect (React Portal Architecture)

To prevent dropdown options from being hidden by parent overflow containers (`overflow: hidden` or `overflow-x: auto` in tables, cards, and modals):

1. **Trigger Button**:
   - `border: 2px solid #000000`, `box-shadow: 1.5px 1.5px 0px #000000`.
   - SVG Chevron arrow rotates 180° when open.
2. **Menu Portal (`createPortal`)**:
   - Mounted to `triggerRef.current.closest("dialog") || document.body`.
   - Uses `position: fixed` with dynamic viewport alignment (opens upward if space below is insufficient).
   - High `z-index: 99999` so it is always above all cards, tables, and dialog backdrops.
3. **Option States**:
   - Unselected: Crisp white background, `#000000` text.
   - Hover / Focus: Inverted solid black background (`#000000`) and pure white text (`#ffffff`).
   - Selected: Light neutral pill highlight (`#f4f4f5`) with checkmark `✓`.

### 4.5 Tabs & Subtabs

Tabs use a tactile folder-tab design connected to the container border below.

```css
/* Tab Container */
.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #000000;
  margin-bottom: 18px;
}

/* Base Tab */
.tab {
  border: 2px solid #000000;
  border-radius: 6px 6px 0 0;
  background: #f4f4f5;
  color: #000000;
  padding: 9px 18px;
  margin-bottom: -2px;
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.12s ease;
}

/* Unselected Tab Hover */
.tab:hover:not([aria-selected="true"]) {
  background: #ffffff;
  transform: translateY(-2px);
  box-shadow: 2px -2px 0px #000000;
}

/* Selected Tab (Active) */
.tab[aria-selected="true"] {
  color: #ffffff;
  background: #000000;
  border-color: #000000;
  border-bottom-color: #000000;
  box-shadow: 2px -2px 0px #000000;
  transform: translateY(-1px);
}

/* Selected Tab Hover (Flips to white background with black text) */
.tab[aria-selected="true"]:hover {
  background: #ffffff;
  color: #000000;
  border-color: #000000;
  transform: translateY(-2px);
  box-shadow: 2px -2px 0px #000000;
}

/* Subtabs Pill Switcher */
.subtabs {
  display: flex;
  background: #ffffff;
  border: 2px solid #000000;
  padding: 3px;
  border-radius: 6px;
  gap: 4px;
  margin-bottom: 14px;
  box-shadow: 2px 2px 0px #000000;
}

.subtab {
  flex: 1;
  text-align: center;
  padding: 6px 12px;
  border-radius: 4px;
  font-family: var(--font-heading);
  font-size: 12.5px;
  font-weight: 800;
  border: 0;
  background: transparent;
  color: var(--mute);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.subtab:hover {
  background: var(--soft);
  color: #000000;
}

.subtab.active {
  background: #000000;
  color: #ffffff;
}
```

### 4.6 Data Tables (`table`)

Tables are high-contrast, compact, and scannable:
- **Header (`thead`)**: Solid pure black background (`#000000`) with uppercase white text (`#ffffff`), `font-family: var(--font-heading)`.
- **Dividers**: Every `td` has a solid `2px solid #000000` bottom border.
- **Hover**: Table rows highlight with `#f4f4f5` on mouse hover.
- **Numeric Columns**: GSM, weights, and costs strictly use `var(--font-mono)` with `tabular-nums`.

```css
table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  border: 2px solid #000000;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 3px 3px 0px #000000;
  margin-bottom: 16px;
}

th {
  background: #000000;
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 10px 10px;
  border-bottom: 2px solid #000000;
  text-align: left;
}

td {
  padding: 10px 10px;
  border-bottom: 2px solid #000000;
  font-size: 13.5px;
  font-weight: 600;
  color: #000000;
  background: #ffffff;
}

tbody tr:hover td {
  background: #f4f4f5;
}
```

### 4.7 Key-Value Summary List (`.kv`)

Used in sidebars, quotation breakdowns, and metric summaries:

```css
.kv {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 9px 4px;
  border-bottom: 2px solid #000000;
  gap: 12px;
}
.kv:hover {
  background: #f4f4f5;
  border-radius: 4px;
}
.kv:last-child {
  border-bottom: 0;
}
.kv span {
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 700;
  color: #000000;
}
.kv b {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  font-size: 13.5px;
  color: #000000;
}
```

### 4.8 Slide-Out Navigation Drawer / Sidebar

The slide-out navigation panel (`components/Sidebar.jsx` or `.drawer`) docks to the right or left edge:
- **Backdrop**: `position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(2px); z-index: 100;`
- **Panel**: `border-left: 2px solid #000000; box-shadow: -4px 0px 0px #000000; width: min(300px, 85vw); background: #ffffff;`
- **Header**: User role, name, email truncated with ellipsis, and mechanical `✕` close button.
- **Links (`.drawer-link`)**: Transparent default, on hover gains `border: 2px solid #000000; box-shadow: 2px 2px 0px #000000; background: #ffffff;`.
- **Logout Button (`.drawer-logout-btn`)**: Solid black background with white text, flips to white background with black text on hover.

### 4.9 Modals & Dialogs (`<dialog>`)

```css
dialog {
  border: 2px solid #000000;
  border-radius: 8px;
  background: #ffffff;
  color: #000000;
  padding: 22px;
  width: min(460px, 92vw);
  box-shadow: 6px 6px 0px #000000;
  overflow: visible; /* Must remain visible for select portals */
}

dialog::backdrop {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
}
```

### 4.10 Validation Error State (`.input-highlight-error`)

When form validation fails, inputs highlight with an intense offset red shadow and trigger a tactile horizontal shake:

```css
@keyframes shake-highlight {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

.input-highlight-error {
  border-color: #000000 !important;
  box-shadow: 3px 3px 0px #ef4444 !important;
  animation: shake-highlight 0.4s ease-in-out;
  background-color: #ffffff !important;
  color: #000000 !important;
}
```

---

## 5. Development Checklist for Frontend Work

Before shipping or modifying any component:
- [ ] **Borders**: Are all visible container boundaries solid black (`2px solid #000000`)?
- [ ] **Drop Shadows**: Are shadows hard and non-blurry (`2px 2px 0px #000`, `3px 3px 0px #000`, `6px 6px 0px #000`)?
- [ ] **Tactile Press**: Do buttons shift down/right on click (`translate(2px, 2px)`)?
- [ ] **Typography**:
  - Headings/Buttons/Labels/Tabs in **Space Grotesk** (`--font-heading`).
  - Body/Inputs in **Plus Jakarta Sans** (`--font-sans`).
  - Numeric metrics/costs in **JetBrains Mono** (`--font-mono`) with `tabular-nums`.
- [ ] **Selected Tab Hover**: Does hovering a selected tab flip background to white and text to black?
- [ ] **Select / Dropdown Overflow**: Are all dropdowns using the React Portal pattern to prevent clipping inside dialogs and tables?
- [ ] **Modal Overflow**: Does `<dialog>` have `overflow: visible`?
- [ ] **File Format**: Is the file pure JavaScript/JSX (`.js`/`.jsx`, strictly no TypeScript)?
- [ ] **Data Normalization**: Are all payloads sent to the backend normalized to `mm`, `kg`, `₹`, and integers?
