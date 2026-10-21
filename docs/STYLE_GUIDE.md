# BoxCalc UI Design System & Style Guide
## Modern Neo-Brutalism (Monochrome / Black & White)

This document is the official design specification for the **BoxCalc** web application. Any AI assistant or developer building, updating, or reviewing user interfaces must strictly adhere to this style guide to ensure a consistent, ultra-scannable, modern Neo-Brutalist aesthetic across the entire website.

---

## 1. Core Principles & Neo-Brutalist Philosophy

1. **High Contrast & Monochrome**: Built primarily on pure black (`#000000`) and stark white (`#ffffff`), with crisp neutral grays for subtle scaffolding.
2. **Tactile & Physical**: Sharp 1.5px – 2px solid black borders, defined bounding boxes, and **hard offset drop shadows** (no soft, diffuse blurs).
3. **Ultra-Scannable**: Heavy typographic hierarchy, bold numerical data, tabular alignment, and uppercase micro-labels for rapid industrial packaging calculations.
4. **Tactile Click Mechanics**: Interactive elements have physical feedback: buttons shift down and right on click (`translate(2px, 2px)`) while collapsing their shadow.
5. **JavaScript Only**: All frontend code must strictly use `.js` and `.jsx` only (no TypeScript, per `docs/RULES.md`).
6. **Data Normalization Rule**: Display units may vary (inches, mm, kg, gm), but **all payloads sent to backend APIs must strictly be normalized to millimeters (`mm`), kilograms (`kg`), Indian Rupees (`₹`), and integer quantities**.

---

## 2. Color Palette & CSS Tokens

All styling references these CSS custom properties in `:root`:

| Token | Hex / Value | Semantic Role |
| :--- | :--- | :--- |
| `--bg` | `#f8f9fa` or `#ffffff` | Clean, stark canvas background |
| `--surface` | `#ffffff` | Primary elevated surfaces: cards, modals, navigation bar, sidebar |
| `--fg` | `#000000` | Pure black primary text, titles, headings, and icons |
| `--mute` | `#52525b` | Secondary text, input hints, table column headers |
| `--line` | `#000000` | Signature 1.5px – 2px solid black borders |
| `--line-soft` | `#e4e4e7` | Inner secondary dividers, grid scaffolding, table rows |
| `--soft` | `#f4f4f5` | Pill backgrounds, hover highlights, light chip badges |
| `--btn` | `#000000` | Primary solid black action button background |
| `--btnfg` | `#ffffff` | Primary button text |
| `--accent` | `#000000` | Focus outlines, highlight borders (monochrome focus) |
| `--shadow-hard` | `2px 2px 0px #000000` | Standard Neo-Brutalist hard shadow for buttons & cards |
| `--shadow-hard-lg` | `4px 4px 0px #000000` | Prominent hard shadow for modals, drawers, and hero cards |

### Status Accents (Minimalist & Stark)
- **Success / Confirmed**: `#000000` text on `#ffffff` with a green indicator dot `#16a34a`, or `bg-[#f0fdf4] text-[#166534] border-2 border-black`.
- **Danger / Delete**: Solid black with red text `#dc2626`, or stark red `#ef4444` with a solid 2px black border.
- **Validation Error Shake**: Border `#000000` with thick red outline `0 0 0 3px #ef4444`.

---

## 3. Typography & Hierarchy

Font Family: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

| Role | Size | Weight | Tracking | Details / Styling |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | `22px` | `800` | `-0.025em` | High impact, uppercase or bold title case |
| **Section Header** | `18px` | `700` | `-0.015em` | Clean, bold division |
| **Card Header** | `14px` | `700` | `0` | Direct, prominent |
| **Category / Group Label** | `11px` | `700` | `+0.06em` | **ALL CAPS**, tracking-wider, color `--mute` |
| **Body Text** | `13.5px` | `400` / `500`| `0` | High legibility, crisp contrast |
| **Form Label** | `11.5px` | `600` | `+0.02em` | Uppercase or bold title, sits directly above inputs |
| **Metric / Number Display** | `26px` – `30px`| `800` | `-0.03em` | `font-variant-numeric: tabular-nums;` |
| **Table Header** | `11px` | `700` | `+0.05em` | Uppercase, color `--mute`, border-b-2 border-black |

---

## 4. Neo-Brutalist Component Specifications

### 1. Buttons

Buttons must feel physical, bold, and punchy.

```css
/* Base Button */
.btn {
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  padding: 8px 16px;
  border: 2px solid #000000;
  cursor: pointer;
  box-shadow: 2px 2px 0px #000000;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.15s ease;
  user-select: none;
}

/* Tactile Active Press */
.btn:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px #000000;
}
.btn:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 0px 0px 0px #000000;
}

/* Primary (Solid Black) */
.btn.pri {
  background: #000000;
  color: #ffffff;
}

/* Secondary (Crisp White) */
.btn.sec {
  background: #ffffff;
  color: #000000;
}

/* Danger (White with Red Border & Shadow) */
.btn.danger {
  background: #ffffff;
  color: #dc2626;
  border-color: #000000;
}
```

### 2. Cards & Containers (`.card`)

Cards use solid 2px black outlines with a bold bottom-right hard shadow:

```css
.card {
  background: #ffffff;
  border: 2px solid #000000;
  border-radius: 8px;
  padding: 18px;
  box-shadow: 3px 3px 0px #000000;
}
```

### 3. Form Inputs & Selects

Inputs are clean and punchy with a 2px black border:

```css
input, select, textarea {
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  color: #000000;
  background: #ffffff;
  border: 2px solid #000000;
  border-radius: 6px;
  padding: 8px 10px;
  width: 100%;
  outline: none;
  transition: box-shadow 0.1s ease;
}

input:focus, select:focus, textarea:focus {
  box-shadow: 2px 2px 0px #000000;
  border-color: #000000;
}
```

### 4. Key-Value Summary List (`.kv`)

Designed for fast vertical scanning of quotation metrics:

```css
.kv {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px dashed #d4d4d8;
  font-size: 13px;
}
.kv:last-child {
  border-bottom: 0;
}
.kv span {
  color: #52525b;
  font-weight: 500;
}
.kv b {
  color: #000000;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
```

### 5. Tables (`table`)

Data tables must be crisp, scannable, and compact:
- Header row: 2px solid black bottom border, uppercase tracking.
- Row divider: 1px solid `#e4e4e7`.
- Hover state: Row background turns `#f4f4f5`.
- Numbers: Always aligned right with `tabular-nums`.

```html
<table class="neo-table">
  <thead>
    <tr>
      <th>ITEM</th>
      <th>GSM</th>
      <th>WEIGHT</th>
      <th style="text-align: right;">RATE (₹)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Top Liner</td>
      <td>180</td>
      <td>0.45 kg</td>
      <td style="text-align: right;"><b>₹ 32.50</b></td>
    </tr>
  </tbody>
</table>
```

### 6. Badges & Chips

Neo-Brutalist tags feature a high-contrast pill with black outline:

```html
<!-- Default Badge -->
<span class="inline-flex items-center px-2 py-0.5 text-xs font-bold border-2 border-black rounded-full bg-white text-black shadow-[1px_1px_0px_#000]">
  5-PLY
</span>

<!-- Solid Inverted Badge -->
<span class="inline-flex items-center px-2 py-0.5 text-xs font-bold border-2 border-black rounded-full bg-black text-white">
  CONFIRMED
</span>
```

### 7. Navigation Drawer / Sidebar

The slide-out drawer follows the same bold, tactile language:
- **Backdrop**: `rgba(0, 0, 0, 0.5)` with `backdrop-filter: blur(2px)`.
- **Drawer Panel**: `border-left: 2px solid #000000`, `box-shadow: -4px 0px 0px #000000`.
- **Navigation Links**:
  - Normal: Transparent background, 2px border on hover.
  - Active: Solid black background `#000000`, crisp white text `#ffffff`, border 2px solid black.

---

## 5. Tailwind CSS & Shadcn Integration for Neo-Brutalism

When using Tailwind classes for new components, use these standard utility combinations:

```jsx
// Neo-brutalist Card
<div className="bg-white border-2 border-black rounded-lg p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
  ...
</div>

// Neo-brutalist Button (Primary)
<button className="px-4 py-2 font-bold text-sm bg-black text-white border-2 border-black rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
  Save Changes
</button>

// Neo-brutalist Button (Secondary)
<button className="px-4 py-2 font-bold text-sm bg-white text-black border-2 border-black rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
  Cancel
</button>

// Neo-brutalist Input
<input className="w-full px-3 py-2 text-sm font-medium border-2 border-black rounded-md bg-white focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all" />
```

---

## 6. Checklist for New Components

Before completing any UI task:
- [ ] Are borders solid black (`border-2 border-black` or `border: 2px solid #000`)?
- [ ] Are shadows hard, offset, and non-blurry (`2px 2px 0px #000` or `3px 3px 0px #000`)?
- [ ] Are buttons tactile with active push feedback (`translate(2px, 2px)`)?
- [ ] Is the primary color scheme strictly high-contrast monochrome (black & white)?
- [ ] Are numeric values using `tabular-nums` for clean visual alignment?
- [ ] Is the file pure JavaScript/JSX (no TypeScript)?
- [ ] Are backend payload numbers normalized to `mm`, `kg`, `₹`, and integers?
