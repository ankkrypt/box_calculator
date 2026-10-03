# Box Calculator — Calculation Flow

A straightforward, step-by-step reference showing how values move through the calculator, the exact formulas used, and the units at every stage.

---

## 1. Visual Flowchart

```mermaid
flowchart TD
  %% STYLING
  classDef step fill:#f8fafc,stroke:#64748b,stroke-width:1.5px,color:#0f172a
  classDef input fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1
  classDef compute fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
  classDef output fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#15803d

  %% STEP 1: BOX INPUTS
  subgraph S1 ["1. Box & Order Inputs"]
    IN_BOX["• Box Type (e.g. RSC)<br/>• Length, L (mm)<br/>• Width, W (mm)<br/>• Height, H (mm)<br/>• Joint Allowance, J (mm)<br/>• Quantity, Q (pcs)<br/>• Score Tolerance, Tol (mm)"]:::input
  end

  %% STEP 2: SHEET COMPUTATION
  subgraph S2 ["2. Sheet Size & Area Engine"]
    CALC_SHEET["<b>Blank Length (mm)</b> = 2 × (L + W) + J + Tol<br/><b>Blank Width (mm)</b> = W + H + Flap Allowance<br/><b>Sheet Area (m²)</b> = (Blank Length × Blank Width) ÷ 1,000,000"]:::compute
  end

  IN_BOX --> CALC_SHEET

  %% STEP 3: PLY LOOP
  subgraph S3 ["3. Per-Ply Layer Calculation (Repeated for Plies 1 to N)"]
    IN_PLY["Per Layer Inputs:<br/>• GSM (g/m²)<br/>• Flute Take-up Factor, F (1.0 for Liner, e.g. 1.32 for B-Flute)<br/>• Paper Rate (₹/kg)"]:::input
    
    CALC_PLY["<b>Layer Weight (kg)</b> = [Sheet Area (m²) × GSM × F] ÷ 1,000<br/><b>Layer Cost (₹)</b> = Layer Weight (kg) × Paper Rate (₹/kg)"]:::compute
    
    IN_PLY --> CALC_PLY
  end

  CALC_SHEET --> IN_PLY

  %% STEP 4: BOARD ROLLUP
  subgraph S4 ["4. Board Paper Cost Rollup"]
    CALC_BOARD["<b>Basic Paper Cost / Box (₹)</b> = Σ (Layer Cost of all plies)"]:::compute
  end

  CALC_PLY --> CALC_BOARD

  %% STEP 5: WASTAGE & CONVERSION
  subgraph S5 ["5. Wastage & Manufacturing Conversion"]
    IN_EXTRA["• Overall Wastage (%)<br/>• Conversion Rate (₹/box)"]:::input
    
    CALC_BASE["<b>Wastage / Box (₹)</b> = Paper Cost × (Wastage % ÷ 100)<br/><b>Paper with Wastage (₹)</b> = Paper Cost + Wastage / Box<br/><b>Base Cost (₹)</b> = Paper with Wastage + Conversion Rate"]:::compute
    
    IN_EXTRA --> CALC_BASE
  end

  CALC_BOARD --> CALC_BASE

  %% STEP 6: MARGIN
  subgraph S6 ["6. Profit Margin"]
    IN_MARG["• Profit Margin (%)"]:::input
    
    CALC_BOX["<b>Margin Amount / Box (₹)</b> = Base Cost × (Margin % ÷ 100)<br/><b>Cost per Box with Margin (₹)</b> = Base Cost + Margin Amount"]:::compute
    
    IN_MARG --> CALC_BOX
  end

  CALC_BASE --> CALC_BOX

  %% STEP 7: ORDER VOLUME & DISCOUNT
  subgraph S7 ["7. Order Total & Commercial Adjustments"]
    IN_COMM["• Transport Freight (₹)<br/>• Discount (%)"]:::input
    
    CALC_ORDER["<b>Total Boxes Cost (₹)</b> = Cost per Box with Margin × Q (pcs)<br/><b>Discount Amount (₹)</b> = Total Boxes Cost × (Discount % ÷ 100)<br/><b>Taxable Subtotal (₹)</b> = (Total Boxes Cost − Discount Amount) + Transport (₹)"]:::compute
    
    IN_COMM --> CALC_ORDER
  end

  CALC_BOX --> CALC_ORDER

  %% STEP 8: TAX & FINAL
  subgraph S8 ["8. Tax & Final Order Price"]
    IN_TAX["• Tax / GST (%)"]:::input
    
    CALC_FINAL["<b>GST Amount (₹)</b> = Taxable Subtotal × (Tax % ÷ 100)<br/><b>FINAL ORDER PRICE (₹)</b> = Taxable Subtotal + GST Amount"]:::output
    
    IN_TAX --> CALC_FINAL
  end

  CALC_ORDER --> CALC_FINAL
```

---

## 2. Box Type Specific Sheet Formulas (Blank Length & Width)

The required sheet width (Deckle) and sheet length (Chop) are **specifically tailored for each box style** based on its flap design:

| Box Style | FEFCO Code | Blank Length ($mm$) | Blank Width / Reel Width Needed ($mm$) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **RSC** (Regular Slotted) | 0201 | $2 \times (L + W) + 4 \times \text{Tol} + J$ | $W + H + 2 \times \text{Tol}$ | Standard top & bottom flaps meet in center ($\frac{W}{2} + H + \frac{W}{2}$). |
| **HSC** (Half Slotted) | 0200 | $2 \times (L + W) + 4 \times \text{Tol} + J$ | $\frac{W}{2} + H + \text{Tol}$ | Open-top container; has bottom flaps only. |
| **FOL** (Full Overlap) | 0204 | $2 \times (L + W) + 4 \times \text{Tol} + J$ | $2 \times W + H + 2 \times \text{Tol}$ | Heavy-duty top & bottom flaps overlap fully by full width ($W$). |
| **TEL** (Telescope) | 0320 | $2 \times (L + 2H + 2 \times \text{Tol})$ | $W + 2 \times H + 2 \times \text{Tol}$ | Two-piece box (tray + lid). |
| **FLD** (Folder) | 0427 | $2 \times L + 2 \times H + 2 \times \text{Tol} + J$ | $W + 2 \times H + 2 \times \text{Tol}$ | One-piece roll-end mailer folder. |

*Where:*
* $L, W, H$: Inside Length, Width, and Height ($mm$)
* $J$: Joint / glue flap allowance ($mm$, default $35\text{ mm}$)
* $\text{Tol}$: Score tolerance ($mm$, e.g. $6\text{ mm}$ for 3-ply, $12\text{ mm}$ for 5-ply)

---

## 3. Step-by-Step Formula & Unit Reference

| Step | Output | Exact Formula | Units |
| :--- | :--- | :--- | :--- |
| **1. Sheet Dimensions** | Blank Length | Per Box Type formula above | $mm$ |
| | Blank Width | Per Box Type formula above (sets minimum reel width needed) | $mm$ |
| | Sheet Area | $(\text{Blank Length} \times \text{Blank Width}) \div 1,000,000$ | $m^2$ |
| **2. Per-Ply Layer** | Layer Weight | $(\text{Sheet Area} \times \text{GSM} \times \text{Take-up Factor}) \div 1,000$ | $kg\text{ / box}$ |
| | Layer Paper Cost | $\text{Layer Weight} \times \text{Paper Price per kg}$ | $₹\text{ / box}$ |
| **3. Box Paper Total** | Paper Cost / Box | $\sum (\text{Layer Paper Cost of each ply})$ | $₹\text{ / box}$ |
| **4. Overall Wastage** | Wastage / Box | $\text{Paper Cost / Box} \times (\text{Overall Wastage \%} \div 100)$ | $₹\text{ / box}$ |
| | Paper with Wastage | $\text{Paper Cost / Box} + \text{Wastage / Box}$ | $₹\text{ / box}$ |
| **5. Base Manufacturing**| Base Cost / Box | $\text{Paper with Wastage} + \text{Conversion Rate (₹/box)}$ | $₹\text{ / box}$ |
| **6. Profit Margin** | Cost with Margin | $\text{Base Cost / Box} \times (1 + \text{Margin \%} \div 100)$ | $₹\text{ / box}$ |
| **7. Order Total** | Total Pcs Cost | $\text{Cost with Margin} \times \text{Quantity (Q)}$ | $₹$ |
| | Discount Amount | $\text{Total Pcs Cost} \times (\text{Discount \%} \div 100)$ | $₹$ |
| | Taxable Subtotal | $(\text{Total Pcs Cost} - \text{Discount Amount}) + \text{Transport (₹)}$ | $₹$ |
| **8. Final Price** | Tax (GST) | $\text{Taxable Subtotal} \times (\text{Tax \%} \div 100)$ | $₹$ |
| | **Final Order Price**| $\mathbf{\text{Taxable Subtotal} + \text{Tax Amount}}$ | $\mathbf{₹}$ |

---

## 4. Key Takeaways
1. **No Per-Layer Wastage**: Each ply layer is computed at 100% pure theoretical weight ($\text{Area} \times \text{GSM} \times \text{Take-up} \div 1000$).
2. **Single Wastage Factor**: Overall Wastage % is applied once to the aggregated paper cost of all plies.
3. **Additive Commercial Layer**: Conversion, Margin, Transport, Discount, and GST are cleanly layered on top of the physical board cost.
