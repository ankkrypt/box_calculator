# Flow Chart Document — Box Calculator SaaS for Vendors

| Field | Value |
|---|---|
| Document | Flow charts |
| Version | 2.2 |
| Date | 2026-09-21 |
| Depends on | BRD v2.1, PRD v2.1 |

Ten diagrams arranged as a **zoom-in sequence** for presentation: start with
the whole system, then expand each subsystem in depth.

| # | Diagram | Zooms into | Phase |
|---|---|---|---|
| 1 | System overview | Everything — clients, server, engine, DB, payments | 1 + 2 |
| 2 | Vendor journey, end-to-end | The happy path across all subsystems | 1 |
| 3 | Auth & permissions | JWT issue + verify, role/plan claims | 1 (parts 2) |
| 4 | Inventory ecosystem | Reels, stock status, ledger, deduction | 1 |
| 5 | Costing engine | The 11-step per-layer algorithm | 1 |
| 6 | Stock-aware suggestion | How board specs are matched to reels | 1 |
| 7 | Quotation finalisation | Terms, PDF, sharing, quote lifecycle | 1 |
| 8 | Orders & bills | Order confirmation, stock deduction, billing | 1 |
| 9 | Subscription & paywall | Razorpay checkout, JWT re-issue on upgrade | 2 |
| 10 | 3D preview | Parametric die-line, Three.js fold | 2 |

All labels are quoted — safe to paste into mermaid.live, GitHub, Notion, or
VS Code (Mermaid extension).

---

## 1. System overview

Everything at a glance: who uses the app, what runs where, and what talks
to what. Each later diagram expands one block of this picture.

```mermaid
flowchart TB
  subgraph CLIENTS["Clients"]
    W["Web app - Next.js mobile-first<br/>public calculator + vendor portal<br/>loads engine for instant estimates"]
    M["Mobile app - Expo<br/>Phase 2 - same API"]
  end

  PUB(["Public user<br/>no login"]) -->|"free basic calculator"| W
  OWN(["Vendor owner<br/>staff accounts in Phase 2"]) -->|"vendor portal"| W

  CF["Cloudflare - edge + TLS"]
  W --> CF
  M -.-> CF

  subgraph SERVER["Node.js single server - Coolify"]
    API["REST/HTTP API"]
    MW["JWT auth middleware<br/>verifies signature<br/>reads tenantId - userId - role - plan claims"]
    ENG["@boxcalc/engine - shared package<br/>pure JS costing engine<br/>same code on server and client"]
    API --> MW
    API --> ENG
  end

  DB[("MongoDB<br/>tenants - users - reels - boxTypes<br/>quotes - orders")]
  PAY["Razorpay<br/>subscriptions - Phase 2"]

  CF --> API
  API -->|"Mongoose tenant-scoped queries"| DB
  API -->|"checkout + webhooks"| PAY
```

---

## 2. Vendor journey — end-to-end (Phase 1)

The happy path a vendor walks through; each box points to the diagram that
expands it in depth.

```mermaid
flowchart TD
  START(["Vendor opens web app"]) --> LANDING{"Who is using it?"}
  LANDING -->|"anonymous visitor"| FREE["Free basic calculator<br/>no login - engine runs client-side"]
  LANDING -->|"vendor owner"| AUTHC{"Has account?"}
  AUTHC -->|"no"| SIGNUP["Sign up - tenant created<br/>owner account + email verification"]
  AUTHC -->|"yes"| LOGIN["Login - email + password<br/>JWT set in httpOnly cookie<br/>detail - diagram 3"]
  SIGNUP --> DASH
  LOGIN --> DASH["Dashboard - recent quotes<br/>stock alerts"]
  DASH --> SETUP{"Inventory set up?"}
  SETUP -->|"no"| REELS["Add reels - grade GSM BF<br/>deckle width - weight - price per kg<br/>detail - diagram 4"]
  REELS --> SETTINGS["Set conversion cost per kg<br/>default margin pct"]
  SETUP -->|"yes"| NEWQ
  SETTINGS --> NEWQ["New quotation<br/>detail - diagrams 5 to 7"]
  NEWQ --> BT{"Pick box type<br/>RSC HSC FOL Telescope OPF<br/>or vendor alias"}
  BT --> DIMS["Enter inside dims L W H mm<br/>and quantity"]
  DIMS --> CONST{"Construction from<br/>stock suggestions?"}
  CONST -->|"pick suggested"| COST["Live per-layer costing<br/>detail - diagram 5"]
  CONST -->|"manual entry"| COST
  COST --> TERMS{"Commercial terms OK?"}
  TERMS -->|"adjust"| ADJ["Margin pct - conversion cost<br/>transport - GST pct"]
  ADJ --> COST
  TERMS -->|"yes"| SAVE["Save quote - draft<br/>number + validity date"]
  SAVE --> PDF["Generate branded PDF quote"]
  PDF --> SHARE["Share - WhatsApp or link"]
  SHARE --> RESP{"Customer response"}
  RESP -->|"accepted"| ORDER["Convert to order<br/>stock deducted - detail - diagram 8"]
  RESP -->|"rejected or expired"| CLOSED["Quote closed"]
  ORDER --> BILL["Generate bill - PDF<br/>branding depends on plan"]
  BILL --> DONE(["Order fulfilled"])
```

---

## 3. Auth & permissions — JWT lifecycle

How tokens are issued, and how every request is checked. No sessions, no
auth framework — a signed JWT carries the permission claims.

```mermaid
flowchart TD
  subgraph LOGINFLOW["Login and token issue"]
    L1(["Login - email + password"]) --> L2["Compare bcrypt / argon2 hash"]
    L2 -->|"match"| L3["Issue signed JWT<br/>claims tenantId - userId - role - plan"]
    L3 --> L4["Set-Cookie - httpOnly - Secure - SameSite"]
    L2 -->|"no match"| L5(["401 - invalid credentials"])
    G1["Google OAuth - Passport.js<br/>Phase 2"] -.->|"verified profile"| L3
  end

  subgraph REQUESTFLOW["Every API request"]
    R1(["Request arrives"]) --> R2{"httpOnly cookie<br/>with JWT present?"}
    R2 -->|"no - public route"| R3["Public calculator only<br/>plan = anonymous"]
    R2 -->|"no - protected route"| R4(["401 - login required"])
    R2 -->|"yes"| R5["Verify JWT signature<br/>read claims"]
    R5 -->|"invalid or expired"| R4
    R5 -->|"valid"| R6{"role and plan<br/>allow this feature?"}
    R6 -->|"owner - vendor features"| R7["Tenant-scoped handler<br/>queries filtered by tenantId"]
    R6 -->|"staff - allowed tasks - Phase 2"| R7
    R6 -->|"free plan - core feature"| R8["Free-tier result<br/>platform branding"]
    R6 -->|"paid feature on free plan"| R9(["403 + upgrade prompt"])
  end

  L4 -.->|"cookie sent on each request"| R2
  W2["Razorpay webhook<br/>plan upgraded - Phase 2"] -.->|"re-issue JWT<br/>with new plan claim"| L3
```

---

## 4. Inventory ecosystem — reels, stock, ledger

Everything that happens to a reel from entry to exhaustion.

```mermaid
flowchart TD
  A(["Admin opens inventory"]) --> FORM["Reel form<br/>grade kraft / semiKraft / testLiner<br/>GSM - BF - fluteFor A C B E N<br/>deckle width mm or inch<br/>reel weight kg 500 to 3000<br/>price per kg - supplier"]
  FORM --> VAL{"Ranges valid?<br/>GSM 100 to 400 - BF 16 to 40"}
  VAL -->|"no"| FORM
  VAL -->|"yes"| SAVE2["Save reel - status available"]
  SAVE2 --> SHEETPOT["Compute sheet potential per active sheet size<br/>sheetWeightKg = sheetL x sheetW x GSM / 1e9<br/>sheetsRemaining = floor reelWeightKg / sheetWeightKg"]
  SHEETPOT --> THRESH{"Sheets remaining vs<br/>vendor threshold"}
  THRESH -->|"below threshold"| LOW["Flag reel - low stock"]
  THRESH -->|"ok"| AVAIL["Status available"]
  LOW --> LEDGER
  AVAIL --> LEDGER["Consumption ledger<br/>tracks which orders used which reels"]
  LEDGER --> CONF{"Order confirmed?<br/>from diagram 8"}
  CONF -->|"yes"| DED["Deduct sheets per layer reel<br/>ledger entry per reel"]
  DED --> ZERO{"Sheets remaining = 0?"}
  ZERO -->|"yes"| EXH["Status exhausted<br/>hidden from suggestions"]
  ZERO -->|"no"| LEDGER
  CONF -->|"no"| LEDGER
  CSV["CSV import - later"] -.-> FORM
  PRICE["Price update on existing reels"] --> LEDGER
```

---

## 5. Costing engine — per-layer algorithm

The 11-step pipeline (PRD §5). All intermediate values are returned for the
breakdown UI.

```mermaid
flowchart TD
  IN(["Inputs - dims - qty - layer stack<br/>allowances - rates"]) --> V{"Validate<br/>dims 1 to 2000 mm<br/>qty 1 to 100000<br/>GSM 100 to 400 - BF 16 to 40"}
  V -->|"invalid"| ERR(["Return validation errors"])
  V -->|"valid"| S1["Step 1 - sheet development<br/>sheetLength = 2L + 2W + jointAllowance<br/>sheetWidth = H + W + scoreTolerance ply"]
  S1 --> S2["Step 2 - sheet area m2<br/>sheetLength x sheetWidth / 1e6"]
  S2 --> LOOP["For each layer in stack"]
  LOOP --> ROLE{"Layer role?"}
  ROLE -->|"liner"| LW["layerWeight = area x GSM / 1000"]
  ROLE -->|"flute"| FW["layerWeight = area x GSM x takeUpFactor / 1000"]
  LW --> WC["layerWastePct from the layer reel deckle<br/>sheetsAcross = floor deckle / layerSheetWidth<br/>wastePct = 1 - sheetsAcross x sheetWidth / deckle x 100"]
  FW --> WC
  WC --> LC["layerCost = layerWeight x pricePerKg<br/>x 1 + wastePct + processWastePct"]
  LC --> MORE{"More layers?"}
  MORE -->|"yes"| LOOP
  MORE -->|"no"| PC["paperCostPerBox = sum of layerCost"]
  PC --> BW["boardWeight = sum of layerWeight"]
  BW --> TG["totalGSM = liner GSM sum + flute GSM x takeUp sum"]
  BW --> CC["conversionCostPerBox = boardWeight x<br/>vendor conversion rate per kg"]
  CC --> MARG["marginPerBox = paperCost + conversionCost x marginPct<br/>margin sits at box level - decision D8"]
  MARG --> CPB["costPerBox = paper + conversion + margin"]
  CPB --> SUB["totalCost = costPerBox x qty"]
  SUB --> TR["transport added"]
  TR --> FOP["finalOrderPrice = totalCost + transport"]
  FOP --> GST["gst = finalOrderPrice x 0.12 - indicative"]
  GST --> TOT["grandTotal = finalOrderPrice + gst"]
  TOT --> DISP["Display - totalGSM - boxWeightKg<br/>totalWeightKg - boardBS kg/cm2"]
  DISP --> OUT(["Return full quote object"])
```

---

## 6. Inventory-aware suggestion

The differentiator: only recommend board specs buildable from stock on hand.

```mermaid
flowchart TD
  REQ(["Required spec - target flute<br/>GSM band - BF band"]) --> MATCH{"Match reels in stock<br/>grade + GSM band + BF band<br/>deckle >= sheet width"}
  MATCH -->|"no match"| CLOSEST["Closest available substitution<br/>clearly labelled"]
  MATCH -->|"matches"| RANK["Rank options<br/>exact GSM match first<br/>show cost delta + sheets available"]
  RANK --> LOW{"Pick would exhaust a reel?"}
  LOW -->|"yes"| WARN["Low-stock warning"]
  LOW -->|"no"| OKS["Clean suggestions"]
  CLOSEST --> PRESENT["Present options to staff"]
  WARN --> PRESENT
  OKS --> PRESENT
  PRESENT --> PICK{"Staff picks one"}
  PICK -->|"yes"| QUOTE["Send stack to costing engine<br/>diagram 5"]
  PICK -->|"no"| MANUAL["Manual construction entry"]
  QUOTE --> ENDD(["Continue to quotation"])
  MANUAL --> ENDD
```

---

## 7. Quotation finalisation & sharing

From costed box to sent quote and its lifecycle.

```mermaid
flowchart TD
  COST(["Costed box from engine - diagram 5"]) --> TERMS["Commercial terms<br/>marginPct per box - conversion rate<br/>transport - GST pct"]
  TERMS --> PREVIEW["Live total preview<br/>costPerBox incl margin - totalCost x qty<br/>transport - GST - grandTotal"]
  PREVIEW --> GSTCONF{"GST line display<br/>confirmed with CA?"}
  GSTCONF -->|"no"| HIDE["Show taxes-as-applicable placeholder"]
  GSTCONF -->|"yes"| SHOW["Show 12 pct indicative line"]
  HIDE --> SAVE
  SHOW --> SAVE["Save quote - number - validity date<br/>status draft"]
  SAVE --> PDFGEN["Branded PDF - vendor logo<br/>layer breakdown - disclaimer"]
  PDFGEN --> ACT{"Send or revise?"}
  ACT -->|"send"| SENT["status sent<br/>share WhatsApp or link"]
  ACT -->|"revise"| TERMS
  SENT --> RESP{"Customer response"}
  RESP -->|"accepted"| ORDER["Convert to order - diagram 8"]
  RESP -->|"rejected"| REJ["status rejected - reason"]
  RESP -->|"no reply"| EXP["status expired at validity date"]
  ORDER --> END1(["Order created"])
  REJ --> END2(["Closed"])
  EXP --> END3(["Closed"])
```

---

## 8. Orders & bills (Phase 1)

Confirmation, automatic stock deduction, and bill generation.

```mermaid
flowchart TD
  ACC(["Accepted quote - diagram 7"]) --> CONVERT["Convert to order<br/>order number - quote snapshot copied"]
  CONVERT --> REVIEW{"Vendor confirms order?"}
  REVIEW -->|"no"| CANCELLED["Order cancelled<br/>stock untouched"]
  REVIEW -->|"yes"| CONSUME["Compute consumption per layer<br/>sheets x qty per reel"]
  CONSUME --> DEDUCT["Deduct sheets from reels<br/>ledger entries reelId - sheets - weightKg"]
  DEDUCT --> FLAGS["Update stock flags<br/>low / exhausted"]
  FLAGS --> BRANDING{"Plan?"}
  BRANDING -->|"free"| PBILL["Bill with platform branding<br/>core feature - never paywalled"]
  BRANDING -->|"paid - Phase 2"| VBILL["Bill with vendor branding<br/>logo + terms"]
  PBILL --> GEN["Printable / PDF bill"]
  VBILL --> GEN
  GEN --> HIST["Order history + search<br/>bill linked to order"]
  HIST --> DONE(["Done"])
```

---

## 9. Subscription & paywall (Phase 2)

Razorpay only for now; a payment-provider abstraction keeps Creem open for
later. The webhook re-issues the JWT so the plan claim stays fresh.

```mermaid
flowchart TD
  GATE(["Paid feature requested<br/>vendor-branded bill - 3D preview -<br/>quote over free limit"]) --> CHECK{"JWT plan claim<br/>paid and subscription active?"}
  CHECK -->|"yes"| ALLOW["Allow feature"]
  CHECK -->|"no or expired"| UPSELL["Upgrade prompt in-product"]
  UPSELL --> PLAN["Choose plan"]
  PLAN --> RZP["Razorpay checkout<br/>UPI - cards - netbanking"]
  RZP --> WEBHOOK["Webhook - payment captured"]
  WEBHOOK --> ACT["Activate subscription<br/>tenantId - plan - renewsAt"]
  ACT --> REISSUE["Re-issue JWT with plan = paid<br/>httpOnly cookie refreshed"]
  REISSUE --> ALLOW
  ALLOW --> USE(["Feature unlocked"])
```

---

## 10. 3D preview (Phase 2)

Parametric fold/unfold driven by the quote — adapted from the
`uuuulala/Threejs-folding-cardboard-box-tutorial` demo after a license
check.

```mermaid
flowchart LR
  Q["Quote dims L W H<br/>+ box type"] --> PARAM["Parametric die-line<br/>sheet development per style"]
  PARAM --> MODEL["Three.js box model<br/>fold / unfold animation"]
  MODEL --> LIVE["Live preview beside calculator"]
  MODEL --> RENDER["Static folded renders for quote PDF"]
  LIC["Verify tutorial repo license<br/>before adapting code"] -.-> MODEL
```

---

## Diagram conventions

- Every node label is quoted (`A["text"]`, `A{"text"}`, `A(["text"])`) —
  colons, apostrophes, slashes and comparison signs are safe everywhere.
- Rounded rectangles = process steps; diamonds = decisions;
  `(["..."])` = start/end; dotted arrows = Phase 2 or later.
- Items marked "indicative" or "confirm with CA/vendor" correspond to
  open questions in the BRD/PRD and `docs/CORRECTED-NOTES.md`.
- Paste any block into mermaid.live, GitHub, Notion, or VS Code
  (Mermaid extension) to render.

---

*Diagrams rendered via Mermaid — paste into mermaid.live, GitHub, Notion, or VS Code (Mermaid extension).*
