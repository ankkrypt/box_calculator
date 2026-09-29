"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BoxPreview from "./BoxPreview";
import DieChart from "./DieChart";
import { TOL, FLUTES, BOX_TYPES, role, samplePlies } from "./data";
import { MM_PER_IN, toDisp, toMM, lenText, areaText, rangeDisp, rangeMM, unitLabel } from "./units";

const fmt = n => Math.round(n).toLocaleString("en-IN");
const kv = (a, b) => <div className="kv"><span>{a}</span><b>{b}</b></div>;

/* Order dimensions are stored in mm (backend standard); unit conversion happens only at display time. */
const DIM_FIELDS = [["L", "Length", 20], ["W", "Width", 20], ["H", "Height", 10]];

/* mm/inch switch — shared, so the unit can be changed from any length field on the page. */
function UnitSelect({ unit, onChange, label = "Unit", className = "" }) {
  return (
    <select aria-label={label} className={className} value={unit} onChange={e => onChange(e.target.value)}>
      <option value="mm">mm</option>
      <option value="inch">inch</option>
    </select>
  );
}

/* Placeholder figures — all calculations come from the backend. */
const sheetOut = unit => [
  ["Sheet size", `${lenText(1475, unit)} × ${lenText(585, unit)} ${unitLabel(unit)}`],
  ["Sheet area", areaText(0.863, unit)],
  ["Reel width needed", `${lenText(585, unit)} ${unitLabel(unit)} or more`],
  ["Score tolerance", `${lenText(12, unit)} ${unitLabel(unit)} per score`],
];
const QUOTE_OUT = [
  ["Paper cost / box", "₹34"],
  ["Conversion / box", "₹6"],
  ["Cost / box with margin", "₹46"],
  ["Total (1,000 pcs)", "₹46,000"],
  ["Tax", "₹8,280"],
  ["Transport", "₹3,500"],
];
const SUM_OUT = [
  ["Weight of 1 box", "0.512 kg"],
  ["Weight of order", "512 kg"],
  ["Overall BS", "12.40 kg/cm²"],
  ["Board", "5 ply"],
  ["Blanks per reel width", "2"],
];

/* Warning copy for destructive bulk actions. */
const confirmCopy = (kind, n) => ({
  "flute-reset": {
    title: "Reset flute table?",
    body: "The whole flute table will be reset to the default placeholder values. Any flutes you added or changes you made will be lost. This action is not reversible.",
    verb: "Reset table",
  },
  "flute-del": {
    title: `Delete ${n} flute${n === 1 ? "" : "s"}?`,
    body: `${n} selected flute${n === 1 ? "" : "s"} will be permanently removed from the table. This action is not reversible.`,
    verb: `Delete ${n}`,
  },
  "reel-del": {
    title: `Delete ${n} reel${n === 1 ? "" : "s"}?`,
    body: `${n} selected reel${n === 1 ? "" : "s"} will be permanently removed from the inventory, and any plies that use them will lose their reel assignment. This action is not reversible.`,
    verb: `Delete ${n}`,
  },
  "tol-reset": {
    title: "Reset score tolerances?",
    body: "The score tolerance defaults for every ply count will be reset to the standard placeholder values. Any changes you made will be lost. This action is not reversible.",
    verb: "Reset tolerances",
  },
}[kind]);

/* Native <dialog> shown with showModal() so it opens centered in front of the page,
   with a dimmed backdrop and Escape-to-dismiss. */
function Modal({ onDismiss, children }) {
  const ref = useRef(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    const cancel = e => { e.preventDefault(); dismiss.current(); };
    d.addEventListener("cancel", cancel);
    return () => d.close();
  }, []);
  return <dialog ref={ref}>{children}</dialog>;
}

export default function Page() {
  const [order, setOrder] = useState({ type: "rsc", L: 400, W: 300, H: 250, Q: 1000, J: 35 });
  const [unit, setUnit] = useState("inch");
  const changeUnit = u => {
    setUnit(u);
    /* State stays in mm; re-round it through the new display unit so typed values look clean. */
    const round = mm => { const d = toDisp(mm, u); return d === "" ? "" : toMM(d, u); };
    setOrder(o => ({ ...o, L: round(o.L), W: round(o.W), H: round(o.H), J: round(o.J) }));
    setTolRows(old => Object.fromEntries(Object.entries(old).map(([p, m]) => [p, round(m) || 0])));
    setTolAll(t => round(t) || 0);
  };
  const [ply, setPly] = useState(5);
  const [quote, setQuote] = useState({ conv: 6, marg: 15, tax: 18, trans: 3500, extra: 2 });
  const [plies, setPlies] = useState(() => samplePlies(5));
  const [tab, setTab] = useState("flute");
  const [tolAll, setTolAll] = useState(TOL[5]);
  const [dialog, setDialog] = useState(null); // {kind:'flute'|'reel', edit}
  const [fluteForm, setFluteForm] = useState({ n: "", f: "", th: "", d: "" });
  const [reelForm, setReelForm] = useState({ w: "", g: "", b: "", p: "", s: "" });
  const [fluteRows, setFluteRows] = useState(FLUTES);
  const [reels, setReels] = useState(() =>
    [900, 1100, 1300, 1500, 1700, 1900].map((w, i) => ({ id: i + 1, w, gsm: 150, bf: 20, price: 42, stock: 5400 }))
  );
  const [tolRows, setTolRows] = useState({ ...TOL });

  const set = (obj, fn) => e => fn({ ...obj, [e.target.name]: e.target.value });
  const setDim = k => e => setOrder(o => ({ ...o, [k]: e.target.value === "" ? "" : toMM(e.target.value, unit) }));
  const setPlyCount = n => {
    setPly(n);
    setPlies(old => samplePlies(n).map((p, i) => old[i] || p));
    setTolAll(TOL[n]);
  };
  const setCell = (i, k) => e =>
    setPlies(old => old.map((p, j) => (j === i ? { ...p, [k]: e.target.value } : p)));
  const setTolCell = p => e => setTolRows(old => ({ ...old, [p]: toMM(e.target.value, unit) || 0 }));
  const setReelW = id => e => setReels(old => old.map(r => (r.id === id ? { ...r, w: toMM(e.target.value, unit) || 0 } : r)));
  const setReel = i => e =>
    setPlies(old => old.map((p, j) => {
      if (j !== i) return p;
      const reel = reels.find(r => r.id === +e.target.value);
      return { ...p, reelId: e.target.value ? +e.target.value : "", price: reel ? String(reel.price) : "" };
    }));
  const setPrice = i => e =>
    setPlies(old => old.map((p, j) => (j === i ? { ...p, price: e.target.value } : p)));
  const isCustom = p => {
    const reel = reels.find(r => r.id === p.reelId);
    return reel != null && p.price !== "" && +p.price !== reel.price;
  };

  const openFlute = (k = null) => {
    const x = k == null ? { n: "", f: "", th: "", d: "" } : fluteRows[k];
    setFluteForm({ ...x });
    setDialog({ kind: "flute", edit: k });
  };
  const openReel = (k = null) => {
    const x = k == null ? { w: "", gsm: "", bf: "", price: "", stock: "" } : reels.find(r => r.id === k);
    setReelForm({ w: x.w, g: x.gsm, b: x.bf, p: x.price, s: x.stock });
    setDialog({ kind: "reel", edit: k });
  };
  const saveFlute = () => {
    const rec = { n: fluteForm.n || "New", f: +fluteForm.f || 1.3, th: fluteForm.th, d: fluteForm.d };
    setFluteRows(old =>
      dialog.edit != null ? old.map((f, i) => (i === dialog.edit ? rec : f)) : [...old, rec]
    );
    setDialog(null);
  };
  const saveReel = () => {
    const rec = { w: +reelForm.w || 0, gsm: +reelForm.g || 0, bf: +reelForm.b || 0, price: +reelForm.p || 0, stock: +reelForm.s || 0 };
    setReels(old =>
      dialog.edit != null
        ? old.map(r => (r.id === dialog.edit ? { ...r, ...rec } : r))
        : [...old, { id: Math.max(0, ...old.map(r => r.id)) + 1, ...rec }]
    );
    setDialog(null);
  };
  const delFlute = k => {
    setFluteRows(old => old.filter((_, i) => i !== k));
    setFluteSel(old => new Set([...old].filter(i => i !== k).map(i => (i > k ? i - 1 : i))));
  };
  const delReel = id => setReels(old => old.filter(r => r.id !== id));

  /* Destructive bulk actions open a warning modal before running. */
  const [confirmBox, setConfirmBox] = useState(null); // {kind, run}
  const askConfirm = (kind, run, n = 0) => () => setConfirmBox({ kind, run, n });
  const [fluteSel, setFluteSel] = useState(() => new Set());
  const [reelSel, setReelSel] = useState(() => new Set());
  const toggleSel = setFn => key => e => {
    const on = e.target.checked;
    setFn(old => {
      const s = new Set(old);
      if (on) s.add(key);
      else s.delete(key);
      return s;
    });
  };
  const resetFlutes = () => {
    setFluteRows(FLUTES);
    setFluteSel(new Set());
  };
  const delSelFlutes = () => {
    setFluteRows(old => old.filter((_, i) => !fluteSel.has(i)));
    setFluteSel(new Set());
  };
  const delSelReels = () => {
    const gone = new Set(reels.filter(r => reelSel.has(r.id)).map(r => r.id));
    setReels(old => old.filter(r => !reelSel.has(r.id)));
    setReelSel(new Set());
    setPlies(old => old.map(p => (gone.has(p.reelId) ? { ...p, reelId: "", price: "" } : p)));
  };

  const fluteOpts = useMemo(
    () => fluteRows.map(f => <option key={f.n} value={f.n}>{f.n} · {f.f.toFixed(2)}</option>),
    [fluteRows]
  );
  const reelOpts = useMemo(
    () => reels.map(r => (
      <option key={r.id} value={r.id}>{lenText(r.w, unit)} {unitLabel(unit)} · {r.gsm}gsm · BF{r.bf} · ₹{r.price}/kg · waste 4%</option>
    )),
    [reels, unit]
  );

  return (
    <>
      <nav>
        <div className="logo"><i />BxCalc</div>
        <div className="nr"><a href="#calc">Try now</a><button className="pri" type="button">Login</button></div>
      </nav>

      <section className="hero">
        <div className="left">
          <h1>Order details</h1>
          <p className="sub">Inside dimensions. Switch between mm and inch — values convert automatically.</p>
          <div className="og">
            <label className="full">Box type
              <select name="type" value={order.type} onChange={set(order, setOrder)}>
                {BOX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            {DIM_FIELDS.map(([k, label, minMM]) => (
              <label key={k}>{label}
                <div className="unit has-select">
                  <input name={k} type="number" inputMode="decimal" min={unit === "mm" ? minMM : +(minMM / MM_PER_IN).toFixed(2)} step={unit === "mm" ? "1" : "0.01"} value={toDisp(order[k], unit)} onChange={setDim(k)} />
                  <UnitSelect unit={unit} onChange={changeUnit} label={`${label} unit`} />
                </div>
              </label>
            ))}
            <label>Quantity<div className="unit"><input name="Q" type="number" min="1" step="1" value={order.Q} onChange={set(order, setOrder)} /><span>pcs</span></div></label>
            <label>Number of ply
              <select value={ply} onChange={e => setPlyCount(+e.target.value)}>
                <option>3</option><option>5</option><option>7</option><option>9</option>
              </select>
            </label>
            <label>Joint allowance<div className="unit has-select"><input name="J" type="number" min="0" step={unit === "inch" ? "0.01" : "1"} value={toDisp(order.J, unit)} onChange={setDim("J")} /><UnitSelect unit={unit} onChange={changeUnit} label="Joint allowance unit" /></div></label>
          </div>
        </div>
        <BoxPreview type={order.type} L={order.L} W={order.W} H={order.H} unit={unit} />
      </section>

      <main id="calc">
        <h2>Calculator</h2>
        <p className="sub">Every figure updates as you change the order.</p>

        <div className="card">
          <h3>Board build – one row per ply</h3>
          <div className="scroll"><table>
            <thead>
              <tr><th>Ply</th><th>GSM</th><th>BF</th><th>Flute take-up</th><th>Reel from inventory (5 closest)</th><th>₹/kg</th><th>Wastage</th><th>Cost</th></tr>
            </thead>
            <tbody>
              {plies.map((p, i) => (
                <tr key={i}>
                  <td>{i + 1} {role(i) === "liner" ? "Liner" : "Flute"}</td>
                  <td><input type="number" min="60" step="1" value={p.gsm} style={{ width: 76 }} onChange={setCell(i, "gsm")} /></td>
                  <td><input type="number" min="10" step="1" value={p.bf} style={{ width: 64 }} onChange={setCell(i, "bf")} /></td>
                  <td>{role(i) === "flute"
                    ? <select value={p.flute} style={{ width: 140 }} onChange={setCell(i, "flute")}>{fluteOpts}</select>
                    : <span className="note">1.00 (liner)</span>}</td>
                  <td><select value={p.reelId} style={{ minWidth: 250 }} onChange={setReel(i)}><option value="">— pick a reel —</option>{reelOpts}</select></td>
                  <td>
                    <input type="number" min="0" step="0.5" value={p.price} placeholder="—" style={{ width: 90 }} onChange={setPrice(i)}
                      title={isCustom(p) ? "Overridden from reel price" : "Inferred from the selected reel"} />
                    {isCustom(p) && <span className="note" style={{ display: "block", marginTop: 2 }}>custom</span>}
                  </td>
                  <td>4.1%</td>
                  <td>₹6.85</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="row" style={{ marginTop: 14 }}>
            <label style={{ maxWidth: 220 }}>Score tolerance (whole board)<div className="unit has-select"><input type="number" min="0" step={unit === "inch" ? "0.01" : "1"} value={toDisp(tolAll, unit)} onChange={e => setTolAll(toMM(e.target.value, unit) || 0)} /><UnitSelect unit={unit} onChange={changeUnit} label="Score tolerance unit" /></div></label>
            <label style={{ maxWidth: 220 }}>Extra wastage by vendor<div className="unit"><input name="extra" type="number" min="0" step="1" value={quote.extra} onChange={set(quote, setQuote)} /><span>%</span></div></label>
            <span className="note" style={{ flex: 2, margin: "0 0 10px", minWidth: 200 }}>Default for {ply} ply is {lenText(TOL[ply], unit)} {unitLabel(unit)}. Clear the field to use it. Extra wastage is added on top of trim wastage in each ply cost.</span>
          </div>
        </div>

        <div className="grid3">
        <div className="card">
          <h3>Sheet</h3>
          {sheetOut(unit).map(([k, v]) => kv(k, v))}
        </div>
          <div className="card">
            <h3>Quotation</h3>
            <div className="g2" style={{ marginBottom: 10 }}>
              <label>Conversion ₹/box<input name="conv" type="number" min="0" step="1" value={quote.conv} onChange={set(quote, setQuote)} /></label>
              <label>Margin %<input name="marg" type="number" min="0" step="1" value={quote.marg} onChange={set(quote, setQuote)} /></label>
              <label>Tax (GST) %<input name="tax" type="number" min="0" step="1" value={quote.tax} onChange={set(quote, setQuote)} /></label>
              <label>Transport ₹<input name="trans" type="number" min="0" step="1" value={quote.trans} onChange={set(quote, setQuote)} /></label>
            </div>
            {QUOTE_OUT.map(([k, v]) => kv(k, v))}
            <div className="kv"><span>Final order price</span><span className="big">₹57,780</span></div>
          </div>
          <div className="card">
            <h3>Box summary</h3>
            {SUM_OUT.map(([k, v]) => kv(k, v))}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="tabs" role="tablist">
            {[["flute", "Flute table"], ["inv", "Reel inventory"], ["tol", "Score tolerance"]].map(([k, label]) => (
              <button key={k} className="tab" role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>

          {tab === "flute" && (
            <div role="tabpanel">
              <div className="row" style={{ alignItems: "center", marginBottom: 6 }}>
                <span className="note" style={{ flex: 2, margin: 0, minWidth: 200 }}>CSV columns: flute, takeup, thickness, description. Flutes with the same name are updated.</span>
                <button type="button" style={{ flex: "none" }}>Import CSV</button>
                <button type="button" style={{ flex: "none" }} onClick={askConfirm("flute-reset", resetFlutes)}>Reset to default</button>
                <button type="button" className={fluteSel.size ? "danger" : ""} style={{ flex: "none" }} disabled={!fluteSel.size} onClick={askConfirm("flute-del", delSelFlutes, fluteSel.size)}>{`Delete selected (${fluteSel.size})`}</button>
                <button type="button" className="pri" style={{ flex: "none" }} onClick={() => openFlute()}>+ Add flute</button>
              </div>
              <div className="scroll"><table style={{ minWidth: 560 }}>
                <thead><tr><th style={{ width: 32 }}><input type="checkbox" aria-label="Select all flutes" checked={fluteRows.length > 0 && fluteSel.size === fluteRows.length} onChange={e => setFluteSel(new Set(e.target.checked ? fluteRows.map((_, i) => i) : []))} /></th><th>Flute</th><th>Take-up</th><th>Thickness <UnitSelect unit={unit} onChange={changeUnit} className="unitpick" label="Thickness unit" /></th><th>Used for</th><th></th></tr></thead>
                <tbody>
                  {fluteRows.map((f, k) => (
                    <tr key={f.n + k}>
                      <td><input type="checkbox" aria-label={`Select ${f.n}`} checked={fluteSel.has(k)} onChange={toggleSel(setFluteSel)(k)} /></td>
                      <td><b>{f.n}</b></td>
                      <td>{f.f.toFixed(2)}</td>
                      <td>{f.th ? rangeDisp(f.th, unit) : "–"}</td>
                      <td>{f.d || "–"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button type="button" style={{ padding: "4px 8px" }} onClick={() => openFlute(k)}>Edit</button>{" "}
                        <button type="button" style={{ padding: "4px 8px" }} onClick={() => delFlute(k)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}

          {tab === "inv" && (
            <div role="tabpanel">
              <div className="row" style={{ alignItems: "end", marginBottom: 10 }}>
                <label style={{ maxWidth: 260 }}>Search<input placeholder="Width, GSM or BF, e.g. 150" /></label>
                <button type="button" style={{ flex: "none" }}>Import CSV</button>
                <button type="button" className={reelSel.size ? "danger" : ""} style={{ flex: "none" }} disabled={!reelSel.size} onClick={askConfirm("reel-del", delSelReels, reelSel.size)}>{`Delete selected (${reelSel.size})`}</button>
                <button type="button" className="pri" style={{ flex: "none" }} onClick={() => openReel()}>+ Add reel</button>
              </div>
              <div className="scroll" style={{ maxHeight: 380, overflowY: "auto" }}><table className="inv" style={{ minWidth: 600 }}>
                <thead><tr><th style={{ width: 32 }}><input type="checkbox" aria-label="Select all reels" checked={reels.length > 0 && reelSel.size === reels.length} onChange={e => setReelSel(new Set(e.target.checked ? reels.map(r => r.id) : []))} /></th><th>Width <UnitSelect unit={unit} onChange={changeUnit} className="unitpick" label="Reel width unit" /></th><th>GSM</th><th>BF</th><th>₹/kg</th><th>Stock (kg)</th><th></th></tr></thead>
                <tbody>
                  {reels.map(r => (
                    <tr key={r.id}>
                      <td><input type="checkbox" aria-label={`Select reel ${r.w}`} checked={reelSel.has(r.id)} onChange={toggleSel(setReelSel)(r.id)} /></td>
                      <td><input type="number" min={unit === "inch" ? "4" : "100"} step={unit === "inch" ? "0.01" : "1"} style={{ width: 100 }} aria-label={`Reel width in ${unitLabel(unit)}`} value={toDisp(r.w, unit)} onChange={setReelW(r.id)} /></td><td>{r.gsm}</td><td>{r.bf}</td><td>₹{r.price}</td><td>{fmt(r.stock)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button type="button" style={{ padding: "4px 8px" }} onClick={() => openReel(r.id)}>Edit</button>{" "}
                        <button type="button" style={{ padding: "4px 8px" }} onClick={() => delReel(r.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}

          {tab === "tol" && (
            <div role="tabpanel">
              <p className="note" style={{ margin: "0 0 10px" }}>Default score tolerance for each ply count. The board field above starts from these values, and you can still override it for a single order.</p>
              <div className="scroll"><table style={{ minWidth: 320 }}>
                <thead><tr><th>Ply</th><th>Score tolerance</th></tr></thead>
                <tbody>
                  {Object.keys(tolRows).map(p => (
                    <tr key={p}><td>{p} ply</td><td><div className="unit has-select" style={{ width: 150 }}><input type="number" min="0" step={unit === "inch" ? "0.01" : "1"} value={toDisp(tolRows[p], unit)} onChange={setTolCell(p)} /><UnitSelect unit={unit} onChange={changeUnit} label={`Score tolerance unit for ${p} ply`} /></div></td></tr>
                  ))}
                </tbody>
              </table></div>
              <div className="row" style={{ marginTop: 10 }}><button type="button" style={{ flex: "none" }} onClick={askConfirm("tol-reset", () => setTolRows({ ...TOL }))}>Reset to standard</button></div>
            </div>
          )}
        </div>

        <p className="note">All figures are placeholders. Formulas and live data come from the backend.</p>
      </main>

      {dialog?.kind === "flute" && (
        <Modal onDismiss={() => setDialog(null)}>
          <h3 style={{ fontSize: 16 }}>{dialog.edit != null ? "Edit flute" : "Add a flute"}</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <label>Flute name<input name="n" maxLength={12} placeholder="e.g. BC" value={fluteForm.n} onChange={set(fluteForm, setFluteForm)} /></label>
            <label>Take-up factor<input name="f" type="number" step="0.01" min="1" placeholder="e.g. 1.32" value={fluteForm.f} onChange={set(fluteForm, setFluteForm)} /></label>
            <label>Thickness range (optional)<div className="unit has-select"><input name="th" placeholder={unit === "inch" ? "e.g. 0.10–0.12" : "e.g. 2.5–3.0"} value={rangeDisp(fluteForm.th, unit)} onChange={e => setFluteForm(f => ({ ...f, th: rangeMM(e.target.value, unit) }))} /><UnitSelect unit={unit} onChange={changeUnit} label="Flute thickness unit" /></div></label>
            <label>Description (optional)<textarea name="d" placeholder="What it is used for, so you can pick it faster next time" value={fluteForm.d} onChange={set(fluteForm, setFluteForm)} /></label>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" style={{ flex: "none" }} onClick={() => setDialog(null)}>Cancel</button>
            <button type="button" className="pri" style={{ flex: "none" }} onClick={saveFlute}>Add flute</button>
          </div>
        </Modal>
      )}

      {confirmBox && (() => {
        const copy = confirmCopy(confirmBox.kind, confirmBox.n);
        return (
          <Modal onDismiss={() => setConfirmBox(null)}>
            <h3 style={{ fontSize: 16, color: "#b3372f" }}>{copy.title}</h3>
            <p style={{ margin: "10px 0 0" }}>{copy.body}</p>
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" style={{ flex: "none" }} onClick={() => setConfirmBox(null)}>Cancel</button>
              <button type="button" className="danger solid" style={{ flex: "none" }} onClick={() => { confirmBox.run(); setConfirmBox(null); }}>{copy.verb}</button>
            </div>
          </Modal>
        );
      })()}

      {dialog?.kind === "reel" && (
        <Modal onDismiss={() => setDialog(null)}>
          <h3 style={{ fontSize: 16 }}>{dialog.edit != null ? "Edit reel" : "Add a reel"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>Reel width<div className="unit has-select"><input name="w" type="number" min={unit === "inch" ? "4" : "100"} step={unit === "inch" ? "0.01" : "1"} placeholder={unit === "inch" ? "e.g. 59.06" : "e.g. 1500"} value={toDisp(reelForm.w, unit)} onChange={e => setReelForm(f => ({ ...f, w: toMM(e.target.value, unit) }))} /><UnitSelect unit={unit} onChange={changeUnit} label="Reel width unit" /></div></label>
            <label>GSM<input name="g" type="number" min="20" step="1" placeholder="e.g. 150" value={reelForm.g} onChange={set(reelForm, setReelForm)} /></label>
            <label>BF<input name="b" type="number" min="1" step="1" placeholder="e.g. 20" value={reelForm.b} onChange={set(reelForm, setReelForm)} /></label>
            <label>Price per kg (₹)<input name="p" type="number" min="1" step="1" placeholder="e.g. 42" value={reelForm.p} onChange={set(reelForm, setReelForm)} /></label>
            <label className="full">Stock in kg (optional)<input name="s" type="number" min="0" step="1" value={reelForm.s} onChange={set(reelForm, setReelForm)} /></label>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" style={{ flex: "none" }} onClick={() => setDialog(null)}>Cancel</button>
            <button type="button" className="pri" style={{ flex: "none" }} onClick={saveReel}>Add reel</button>
          </div>
        </Modal>
      )}
    </>
  );
}
