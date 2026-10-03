"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  clearAuthSession,
  inviteStaff,
  getStaffList,
  removeStaff,
  getVendorPricingSettings,
  updateVendorPricingSettings,
  getQuotation,
  updateQuotation,
  calculateAndSaveQuotation,
  getLatestQuotation,
  confirmOrder,
  getOrders,
  getReels,
  createReel,
  updateReel,
  deleteReel,
  bulkDeleteReels,
  getFlutes,
  createFlute,
  updateFlute,
  deleteFlute,
  bulkDeleteFlutes,
  resetFlutes as resetFlutesApi,
  getScoreTolerances,
  updateScoreTolerances,
  resetScoreTolerances as resetScoreTolerancesApi,
  getPaperGrades,
  createPaperGrade,
  updatePaperGrade,
  deletePaperGrade,
  bulkDeletePaperGrades,
  resetPaperGrades as resetPaperGradesApi,
} from "./auth-client";
import BoxPreview from "./BoxPreview";
import DieChart from "./DieChart";
import HourglassLoader from "./HourglassLoader";
import { TOL, FLUTES, BOX_TYPES, role, samplePlies } from "./data";
import { MM_PER_IN, toDisp, toMM, lenText, areaText, rangeDisp, rangeMM, unitLabel } from "./units";

const fmt = (n, decimals = 0) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "0";
  const num = Number(n);
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const fmtMoney = (n, forceDecimals = null) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "0";
  const num = Number(n);
  const minDec = forceDecimals !== null ? forceDecimals : (num % 1 !== 0 ? 2 : 0);
  const maxDec = forceDecimals !== null ? forceDecimals : 2;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  });
};

const kv = (a, b, key) => <div key={key ?? a} className="kv"><span>{a}</span><b>{b}</b></div>;

/* Order dimensions are stored in mm (backend standard); unit conversion happens only at display time. */
const DIM_FIELDS = [["L", "Length", 20], ["W", "Width", 20], ["H", "Height", 10]];

/**
 * Default inside dimensions (mm) per box type.
 * These are industry-typical starter values; user can always override them.
 *   RSC  – general shipping carton
 *   HSC  – tray/display (lower height, open top)
 *   FOL  – flat mailer / book box (shallow height, wide bottom)
 *   TEL  – two-piece telescope (taller for lid telescoping)
 *   FLD  – one-piece folder / book wrap (long & shallow)
 */
const BOX_TYPE_DEFAULTS = {
  rsc: { L: 400, W: 300, H: 250 },
  hsc: { L: 350, W: 250, H: 120 },
  fol: { L: 380, W: 280, H: 200 },
  tel: { L: 350, W: 250, H: 280 },
  fld: { L: 450, W: 300, H: 80  },
};

/* mm/inch switch — shared, so the unit can be changed from any length field on the page. */
function UnitSelect({ unit, onChange, label = "Unit", className = "" }) {
  return (
    <select aria-label={label} className={className} value={unit} onChange={e => onChange(e.target.value)}>
      <option value="mm">mm</option>
      <option value="inch">inch</option>
    </select>
  );
}



/* Warning copy for destructive bulk actions. */
const confirmCopy = (kind, n) => ({
  "flute-reset": {
    title: "Reset flute table?",
    body: "The whole flute table will be reset to the industry standard values. Any flutes you added or changes you made will be lost. This action is not reversible.",
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
    body: "The score tolerance defaults for every ply count will be reset to the standard values. Any changes you made will be lost. This action is not reversible.",
    verb: "Reset tolerances",
  },
  "paper-reset": {
    title: "Reset paper grades?",
    body: "The paper grades list will be reset to the industry standard values. Any grades you added or changes you made will be lost. This action is not reversible.",
    verb: "Reset paper grades",
  },
  "paper-del": {
    title: `Delete paper grade?`,
    body: `This paper grade will be permanently removed. This action is not reversible.`,
    verb: `Delete grade`,
  },
  "paper-del-bulk": {
    title: `Delete ${n} paper grade${n === 1 ? "" : "s"}?`,
    body: `${n} selected paper grade${n === 1 ? "" : "s"} will be permanently removed. This action is not reversible.`,
    verb: `Delete ${n}`,
  },
}[kind]);

/* Native <dialog> shown with showModal() so it opens centered in front of the page,
   with a dimmed backdrop and Escape-to-dismiss. */
function Modal({ onDismiss, children, style = {}, className = "" }) {
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
  return <dialog ref={ref} className={className} style={style}>{children}</dialog>;
}

export default function Page() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const isStaff = user?.role === "staff";
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function verifyAuth() {
      // Fast path: if there is no token or stored user in localStorage, immediately redirect to /auth
      if (typeof window !== "undefined" && !localStorage.getItem("bxcalc.user") && !localStorage.getItem("bxcalc.accessToken")) {
        router.replace("/auth");
        return;
      }

      try {
        const u = await getCurrentUser();
        if (!mounted) return;
        if (u) {
          setUser(u);
          setCheckingAuth(false);
        } else {
          clearAuthSession();
          router.replace("/auth");
        }
      } catch {
        if (!mounted) return;
        clearAuthSession();
        router.replace("/auth");
      }
    }

    verifyAuth();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogout = () => {
    setCheckingAuth(true);
    clearAuthSession();
    setUser(null);
    router.replace("/auth");
  };

  /* Sidebar Drawer & Profile Modal State */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const scrollToQuotation = () => {
    setSidebarOpen(false);
    const el = document.getElementById("quotation-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.style.transition = "box-shadow 0.3s ease, border-color 0.3s ease";
      el.style.boxShadow = "0 0 0 2px var(--accent, #2b7fd6)";
      setTimeout(() => {
        el.style.boxShadow = "";
      }, 1500);
    }
  };

  const handleSidebarInviteStaff = () => {
    setSidebarOpen(false);
    openStaffModal();
  };

  const handleOpenProfile = async () => {
    setSidebarOpen(false);
    setProfileModalOpen(true);
    if (user?.role === "vendor" && staffList.length === 0) {
      try {
        const list = await getStaffList();
        setStaffList(list);
      } catch {
        // ignore
      }
    }
  };

  /* Staff Management State */
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteErr, setInviteErr] = useState("");

  const openStaffModal = async () => {
    setStaffModalOpen(true);
    setInviteMsg("");
    setInviteErr("");
    setStaffLoading(true);
    try {
      const list = await getStaffList();
      setStaffList(list);
    } catch (err) {
      setInviteErr(err.message || "Failed to load staff list");
    } finally {
      setStaffLoading(false);
    }
  };

  const handleInviteStaff = async (e) => {
    e.preventDefault();
    setInviteMsg("");
    setInviteErr("");
    if (!inviteEmail.trim()) {
      setInviteErr("Staff email is required");
      return;
    }
    setInviteBusy(true);
    try {
      await inviteStaff({ name: inviteName, email: inviteEmail });
      setInviteMsg(`Invite sent to ${inviteEmail}! Temporary password is their email.`);
      setInviteName("");
      setInviteEmail("");
      const updated = await getStaffList();
      setStaffList(updated);
    } catch (err) {
      setInviteErr(err.message || "Failed to invite staff");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRemoveStaff = async (id, email) => {
    if (!window.confirm(`Remove staff member ${email}? This will revoke their access immediately.`)) return;
    try {
      await removeStaff(id);
      setStaffList(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      alert(err.message || "Failed to remove staff member");
    }
  };

  const [order, setOrder] = useState({ type: "rsc", L: 400, W: 300, H: 250, Q: 1000, J: 35 });
  const [unit, setUnit] = useState("mm");
  const changeUnit = u => {
    setUnit(u);
    /* State stays in mm; re-round it through the new display unit so typed values look clean. */
    const round = mm => { const d = toDisp(mm, u); return d === "" ? "" : toMM(d, u); };
    setOrder(o => ({ ...o, L: round(o.L), W: round(o.W), H: round(o.H), J: round(o.J) }));
    setTolRows(old => Object.fromEntries(Object.entries(old).map(([p, m]) => [p, round(m) || 0])));
    setSavedTolRows(old => Object.fromEntries(Object.entries(old).map(([p, m]) => [p, round(m) || 0])));
    setTolAll(t => round(t) || 0);
  };
  const [ply, setPly] = useState(5);
  const [quote, setQuote] = useState({ conv: 2, marg: 10, tax: 5, trans: 3500, extra: 5 });
  const [orderDiscount, setOrderDiscount] = useState(0); // per-order discount %, never saved to quotation schema
  const [plies, setPlies] = useState(() => samplePlies(5));
  const [tab, setTab] = useState("flute");
  const [tolAll, setTolAll] = useState(0);
  const [dialog, setDialog] = useState(null); // {kind:'flute'|'reel'|'paper', edit}
  const [dialogErr, setDialogErr] = useState("");
  const [fluteForm, setFluteForm] = useState({ n: "", f: "", th: "", d: "" });
  const [reelForm, setReelForm] = useState({ w: "", g: "", b: "", p: "", s: "", pg: "" });
  const [paperForm, setPaperForm] = useState({ n: "", g: "", b: "" });
  const [fluteRows, setFluteRows] = useState([]);
  const [paperRows, setPaperRows] = useState([]);
  const [reels, setReels] = useState([]);
  const [tolRows, setTolRows] = useState({});
  const [savedTolRows, setSavedTolRows] = useState({});
  const [reelSearch, setReelSearch] = useState("");
  const displayReels = useMemo(() => {
    if (!reelSearch.trim()) return reels;
    const q = reelSearch.trim().toLowerCase();
    return reels.filter(r =>
      String(r.w).includes(q) ||
      String(r.gsm).includes(q) ||
      String(r.bf).includes(q) ||
      String(r.price).includes(q) ||
      (r.paperGrade && r.paperGrade.toLowerCase().includes(q)) ||
      (r.flute && r.flute.toLowerCase().includes(q)) ||
      (r.shade && r.shade.toLowerCase().includes(q))
    );
  }, [reels, reelSearch]);

  const set = (obj, fn) => e => fn({ ...obj, [e.target.name]: e.target.value });
  const setDim = k => e => setOrder(o => ({ ...o, [k]: e.target.value === "" ? "" : toMM(e.target.value, unit) }));
  const setPlyCount = n => {
    setPly(n);
    setPlies(old => samplePlies(n).map((p, i) => old[i] || p));
    setTolAll(tolRows[n] || 0);
  };
  const setCell = (i, k) => e =>
    setPlies(old => old.map((p, j) => {
      if (j !== i) return p;
      const res = { ...p, [k]: e.target.value };
      if (k === "gsm" || k === "bf") res.paperName = "";
      return res;
    }));

  const [savingTol, setSavingTol] = useState(null);
  const [savedTol, setSavedTol] = useState(null);

  const handleTolChange = p => e => {
    const raw = e.target.value;
    const val = raw === "" ? "" : (toMM(raw, unit) ?? 0);
    setTolRows(old => ({ ...old, [p]: val }));
  };

  const handleSaveTolRow = async p => {
    const rawVal = tolRows[p];
    const val = rawVal === "" || isNaN(Number(rawVal)) ? 0 : Number(rawVal);
    setSavingTol(p);
    try {
      const nextTols = { ...tolRows, [String(p)]: val };
      const saved = await updateScoreTolerances(nextTols);
      const updated = saved && typeof saved === "object" ? saved : nextTols;
      setTolRows(updated);
      setSavedTolRows(updated);
      if (Number(ply) === Number(p)) {
        setTolAll(val);
      }
      setSavedTol(p);
      setTimeout(() => {
        setSavedTol(curr => (curr === p ? null : curr));
      }, 2000);
    } catch (err) {
      alert(err.message || "Failed to save score tolerance");
    } finally {
      setSavingTol(null);
    }
  };

  const handleResetTolerances = async () => {
    try {
      const res = await resetScoreTolerancesApi();
      const fresh = res || { ...TOL };
      setTolRows(fresh);
      setSavedTolRows(fresh);
      if (fresh[ply] !== undefined) {
        setTolAll(fresh[ply]);
      }
    } catch (err) {
      alert(err.message || "Failed to reset score tolerances");
    }
  };

  const setReelW = id => e => setReels(old => old.map(r => (String(r.id) === String(id) || String(r._id) === String(id) ? { ...r, w: toMM(e.target.value, unit) || 0 } : r)));

  const setReelPaper = e => {
    const pg = e.target.value;
    const paper = paperRows.find(p => p.name === pg);
    if (paper) {
      setReelForm(f => ({
        ...f,
        pg,
        g: String(paper.gsm || f.g),
        b: String(paper.bf || f.b),
      }));
    } else {
      setReelForm(f => ({ ...f, pg }));
    }
  };

  const handleReelWBlur = (id, val) => async () => {
    try {
      const target = reels.find(r => String(r.id) === String(id) || String(r._id) === String(id));
      if (target?._id) {
        await updateReel(target._id, { w: val });
      }
    } catch {
      // non-blocking
    }
  };

  const setReel = i => e => {
    const val = e.target.value;
    if (val === "__new_reel__") {
      openReel(null, i);
      return;
    }
    setPlies(old => old.map((p, j) => {
      if (j !== i) return p;
      if (!val) {
        return { ...p, reelId: "" };
      }
      const reel = reels.find(r => String(r.id) === String(val) || String(r._id) === String(val));
      if (!reel) {
        return { ...p, reelId: val };
      }

      // 1. GSM from reel
      const gsm = (reel.gsm !== undefined && reel.gsm !== null && reel.gsm !== "")
        ? String(reel.gsm)
        : p.gsm;

      // 2. BF from reel
      const bf = (reel.bf !== undefined && reel.bf !== null && reel.bf !== "")
        ? String(reel.bf)
        : p.bf;

      // 3. Price per kg from reel
      const price = (reel.price !== undefined && reel.price !== null && reel.price !== "")
        ? String(reel.price)
        : p.price;

      // 4. Paper grade / quality
      let paperName = p.paperName;
      if (reel.paperGrade && reel.paperGrade.trim()) {
        const found = paperRows.find(pr => pr.name.toLowerCase() === reel.paperGrade.trim().toLowerCase());
        paperName = found ? found.name : reel.paperGrade.trim();
      } else {
        // If reel doesn't have an explicit paperGrade string, match against paperRows by GSM and BF
        const found = paperRows.find(pr => Number(pr.gsm) === Number(gsm) && Number(pr.bf) === Number(bf));
        if (found) {
          paperName = found.name;
        }
      }

      // 5. Flute if flute layer
      const isFlute = role(j) === "flute";
      let flute = p.flute;
      if (isFlute) {
        if (reel.flute && reel.flute.trim()) {
          flute = reel.flute.trim();
        } else if (!flute) {
          flute = fluteRows[0]?.n || "B";
        }
      }

      return {
        ...p,
        reelId: val,
        gsm,
        bf,
        price,
        paperName,
        flute,
      };
    }));
  };

  const setPaper = i => e => {
    const paperName = e.target.value;
    setPlies(old => old.map((p, j) => {
      if (j !== i) return p;
      if (!paperName) {
        return { ...p, paperName: "" };
      }
      const paper = paperRows.find(r => r.name === paperName);
      if (paper) {
        return {
          ...p,
          paperName: paper.name,
          gsm: String(paper.gsm),
          bf: String(paper.bf),
        };
      }
      return { ...p, paperName };
    }));
  };

  const setPrice = i => e => {
    const val = e.target.value;
    setPlies(old => old.map((p, j) => {
      if (j !== i) return p;
      // If user manually enters/edits paper cost per kg, deselect reel dropdown and keep reelId empty
      return { ...p, price: val, reelId: "" };
    }));
  };

  const isCustom = p => {
    if (!p.reelId) return false;
    const reel = reels.find(r => String(r.id) === String(p.reelId) || String(r._id) === String(p.reelId));
    return reel != null && p.price !== "" && +p.price !== reel.price;
  };

  const openFlute = (k = null, plyIndex = null) => {
    const x = k == null ? { n: "", f: "", th: "", d: "" } : fluteRows[k];
    setFluteForm({ ...x });
    setDialogErr("");
    setDialog({ kind: "flute", edit: k, plyIndex });
  };

  const openReel = (k = null, plyIndex = null) => {
    const x = k == null ? null : reels.find(r => String(r.id) === String(k) || String(r._id) === String(k));
    const targetPly = (plyIndex != null && plies[plyIndex]) ? plies[plyIndex] : null;
    const initialW = x ? x.w : (reqReelW || "");
    const initialG = x ? x.gsm : (targetPly?.gsm || "");
    const initialB = x ? x.bf : (targetPly?.bf || "");
    const initialP = x ? x.price : (targetPly?.price || "");
    const initialS = x ? x.stock : "";
    const initialPg = x ? (x.paperGrade || "") : (targetPly?.paperName || "");
    setReelForm({
      w: initialW,
      g: initialG,
      b: initialB,
      p: initialP,
      s: initialS,
      pg: initialPg,
    });
    setDialogErr("");
    setDialog({ kind: "reel", edit: k, plyIndex });
  };

  const openPaper = (k = null) => {
    const x = k == null ? { name: "", gsm: "", bf: "" } : paperRows.find(p => String(p._id) === String(k));
    setPaperForm({ n: x ? x.name : "", g: x ? x.gsm : "", b: x ? x.bf : "" });
    setDialogErr("");
    setDialog({ kind: "paper", edit: k });
  };

  const saveFlute = async () => {
    const rec = {
      n: fluteForm.n?.trim()?.toUpperCase() || "NEW",
      f: +fluteForm.f || 1.3,
      th: fluteForm.th || "",
      d: fluteForm.d || "",
    };
    try {
      if (dialog.edit != null) {
        const existing = fluteRows[dialog.edit];
        if (existing?._id) {
          const updated = await updateFlute(existing._id, rec);
          setFluteRows(old => old.map((f, i) => (i === dialog.edit ? updated : f)));
        } else {
          setFluteRows(old => old.map((f, i) => (i === dialog.edit ? { ...f, ...rec } : f)));
        }
      } else {
        const created = await createFlute(rec);
        setFluteRows(old => [...old, created]);
      }
      if (dialog?.plyIndex !== null && dialog?.plyIndex !== undefined) {
        setPlies(old => old.map((p, j) => (j === dialog.plyIndex ? { ...p, flute: rec.n } : p)));
      }
      setDialog(null);
    } catch (err) {
      setDialogErr(err.message || "Failed to save flute");
    }
  };

  const saveReel = async () => {
    const payload = {
      w: +reelForm.w || 0,
      gsm: +reelForm.g || 0,
      bf: +reelForm.b || 0,
      price: +reelForm.p || 0,
      stock: +reelForm.s || 0,
      paperGrade: reelForm.pg || "",
    };
    try {
      if (dialog.edit != null) {
        const editedReel = reels.find(r => String(r.id) === String(dialog.edit) || String(r._id) === String(dialog.edit));
        const reelDocId = editedReel?._id || dialog.edit;
        const updated = await updateReel(reelDocId, payload);
        const normalized = { ...updated, id: updated?._id ? String(updated._id) : dialog.edit };
        setReels(old => old.map(r => (String(r.id) === String(dialog.edit) || String(r._id) === String(dialog.edit) ? normalized : r)));
      } else {
        const created = await createReel(payload);
        const normalized = { ...created, id: created?._id ? String(created._id) : (Math.max(0, ...reels.map(r => Number(r.id) || 0)) + 1) };
        setReels(old => [...old, normalized]);
        if (dialog?.plyIndex !== null && dialog?.plyIndex !== undefined) {
          const targetIdx = dialog.plyIndex;
          setPlies(old => old.map((p, j) => {
            if (j !== targetIdx) return p;
            const isFlute = role(j) === "flute";
            return {
              ...p,
              reelId: normalized.id,
              gsm: normalized.gsm ? String(normalized.gsm) : p.gsm,
              bf: normalized.bf ? String(normalized.bf) : p.bf,
              price: normalized.price ? String(normalized.price) : p.price,
              paperName: normalized.paperGrade || p.paperName,
              flute: isFlute ? (normalized.flute || p.flute || "B") : p.flute,
            };
          }));
        }
      }
      setDialog(null);
    } catch (err) {
      setDialogErr(err.message || "Failed to save reel");
    }
  };

  const savePaper = async () => {
    const payload = {
      name: paperForm.n?.trim(),
      gsm: +paperForm.g || 0,
      bf: +paperForm.b || 0,
    };
    if (!payload.name) return setDialogErr("Name is required");
    try {
      if (dialog.edit != null) {
        const updated = await updatePaperGrade(dialog.edit, payload);
        setPaperRows(old => old.map(p => String(p._id) === String(dialog.edit) ? updated : p));
      } else {
        const created = await createPaperGrade(payload);
        setPaperRows(old => [...old, created]);
      }
      setDialog(null);
    } catch (err) {
      setDialogErr(err.message || "Failed to save paper grade");
    }
  };

  const delFlute = async (k) => {
    const target = fluteRows[k];
    try {
      if (target?._id) {
        await deleteFlute(target._id);
      }
      setFluteRows(old => old.filter((_, i) => i !== k));
      setFluteSel(old => new Set([...old].filter(i => i !== k).map(i => (i > k ? i - 1 : i))));
    } catch (err) {
      alert(err.message || "Failed to delete flute");
    }
  };

  const delReel = async (id) => {
    const target = reels.find(r => String(r.id) === String(id) || String(r._id) === String(id));
    const reelDocId = target?._id || id;
    try {
      if (target?._id) {
        await deleteReel(reelDocId);
      }
      setReels(old => old.filter(r => String(r.id) !== String(id) && String(r._id) !== String(id)));
      setReelSel(old => {
        const next = new Set(old);
        next.delete(id);
        return next;
      });
      setPlies(old => old.map(p => (String(p.reelId) === String(id) ? { ...p, reelId: "", price: "" } : p)));
    } catch (err) {
      alert(err.message || "Failed to delete reel");
    }
  };

  const delPaper = async (id) => {
    try {
      await deletePaperGrade(id);
      setPaperRows(old => old.filter(p => String(p._id) !== String(id)));
      setPaperSel(old => {
        const next = new Set(old);
        next.delete(id);
        return next;
      });
    } catch (err) {
      alert(err.message || "Failed to delete paper grade");
    }
  };



  /* Confirmed Order & Order History State */
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState("");
  const [orderErrMsg, setOrderErrMsg] = useState("");
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [ordersList, setOrdersList] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState("");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  /* Quotation Settings Modal State (Vendor Edit) */
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [modalConv, setModalConv] = useState(2);
  const [modalMarg, setModalMarg] = useState(10);
  const [modalTax, setModalTax] = useState(5);
  const [modalDiscount, setModalDiscount] = useState(0);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsErr, setSettingsErr] = useState("");

  // Load initial vendor rates and inventory on login
  useEffect(() => {
    if (!user) return;
    let active = true;

    async function loadInitialData() {
      try {
        const [quoteRes, reelsRes, flutesRes, tolRes, paperRes] = await Promise.allSettled([
          getQuotation(),
          getReels(),
          getFlutes(),
          getScoreTolerances(),
          getPaperGrades(),
        ]);

        if (!active) return;

        let activeConv = 2;
        let activeMarg = 10;
        let activeTax = 5;

        if (quoteRes.status === "fulfilled" && quoteRes.value?.quotation) {
          const q = quoteRes.value.quotation;
          activeConv = q.conversion !== undefined ? q.conversion : (q.conv !== undefined ? q.conv : 2);
          activeMarg = q.profitMargin !== undefined ? q.profitMargin : (q.marg !== undefined ? q.marg : 10);
          activeTax = q.tax !== undefined ? q.tax : 5;
          setQuote(prev => ({
            ...prev,
            conv: activeConv,
            marg: activeMarg,
            tax: activeTax,
          }));
          setModalConv(activeConv);
          setModalMarg(activeMarg);
          setModalTax(activeTax);
        }

        let liveReels = [];
        if (reelsRes.status === "fulfilled" && Array.isArray(reelsRes.value)) {
          liveReels = reelsRes.value.map(r => ({
            ...r,
            id: r._id ? String(r._id) : r.id,
          }));
          setReels(liveReels);
        }

        let liveFlutes = [];
        if (flutesRes.status === "fulfilled" && Array.isArray(flutesRes.value)) {
          liveFlutes = flutesRes.value;
          setFluteRows(liveFlutes);
        }

        let liveTols = {};
        if (tolRes.status === "fulfilled" && tolRes.value && typeof tolRes.value === "object") {
          liveTols = tolRes.value;
          setTolRows(liveTols);
          setSavedTolRows(liveTols);
        }

        if (paperRes.status === "fulfilled" && Array.isArray(paperRes.value)) {
          setPaperRows(paperRes.value);
        }
      } catch {
        // Non-blocking initialization
      }
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, [user]);

  const openOrderHistory = async () => {
    setOrderHistoryOpen(true);
    setOrdersLoading(true);
    setOrdersErr("");
    try {
      const orders = await getOrders();
      setOrdersList(Array.isArray(orders) ? orders : []);
    } catch (err) {
      setOrdersErr(err.message || "Failed to load order history");
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    setOrderErrMsg("");
    setOrderSuccessMsg("");

    const errors = [];

    // 1. Box dimensions & specs
    if (!order.L || Number(order.L) <= 0 || isNaN(Number(order.L))) {
      errors.push({ id: "input-order-L", label: "Length" });
    }
    if (!order.W || Number(order.W) <= 0 || isNaN(Number(order.W))) {
      errors.push({ id: "input-order-W", label: "Width" });
    }
    if (!order.H || Number(order.H) <= 0 || isNaN(Number(order.H))) {
      errors.push({ id: "input-order-H", label: "Height" });
    }
    if (!order.Q || Number(order.Q) <= 0 || isNaN(Number(order.Q))) {
      errors.push({ id: "input-order-Q", label: "Quantity" });
    }
    if (!ply || Number(ply) < 3 || isNaN(Number(ply))) {
      errors.push({ id: "select-order-ply", label: "Number of ply" });
    }
    if (order.J === "" || order.J === null || order.J === undefined || Number(order.J) < 0 || isNaN(Number(order.J))) {
      errors.push({ id: "input-order-J", label: "Joint allowance" });
    }

    // 2. Each ply layer (GSM, BF, ₹/kg)
    for (let i = 0; i < ply; i++) {
      const p = plies[i] || {};
      const layerType = role(i) === "liner" ? "Liner" : "Flute";

      if (!p.gsm || Number(p.gsm) <= 0 || isNaN(Number(p.gsm))) {
        errors.push({ id: `ply-gsm-${i}`, label: `Ply ${i + 1} (${layerType}) GSM` });
      }
      if (!p.bf || Number(p.bf) <= 0 || isNaN(Number(p.bf))) {
        errors.push({ id: `ply-bf-${i}`, label: `Ply ${i + 1} (${layerType}) BF` });
      }
      if (p.price === "" || p.price === null || p.price === undefined || Number(p.price) <= 0 || isNaN(Number(p.price))) {
        errors.push({ id: `ply-price-${i}`, label: `Ply ${i + 1} (${layerType}) ₹/kg` });
      }
    }

    // 3. Score tolerance
    if (tolAll === "" || tolAll === null || tolAll === undefined || Number(tolAll) < 0 || isNaN(Number(tolAll))) {
      errors.push({ id: "input-score-tol", label: "Score tolerance" });
    }

    // 4. Overall wastage
    if (quote.extra === "" || quote.extra === null || quote.extra === undefined || Number(quote.extra) < 0 || isNaN(Number(quote.extra))) {
      errors.push({ id: "input-overall-wastage", label: "Overall wastage %" });
    }

    // 5. Transport
    if (quote.trans === "" || quote.trans === null || quote.trans === undefined || Number(quote.trans) < 0 || isNaN(Number(quote.trans))) {
      errors.push({ id: "input-transport-cost", label: "Transport cost" });
    }

    // If any validation errors exist, highlight ALL invalid inputs in red at once!
    if (errors.length > 0) {
      setConfirmingOrder(false);

      // Clear previous highlights
      document.querySelectorAll(".input-highlight-error").forEach(el => {
        el.classList.remove("input-highlight-error");
      });

      // Highlight EVERY invalid input simultaneously in red!
      errors.forEach(err => {
        const el = document.getElementById(err.id);
        if (el) {
          el.classList.add("input-highlight-error");

          // When user enters/updates this specific field, remove its red highlight individually
          const onInput = () => {
            el.classList.remove("input-highlight-error");
            el.removeEventListener("input", onInput);
            el.removeEventListener("change", onInput);
          };
          el.addEventListener("input", onInput);
          el.addEventListener("change", onInput);
        }
      });

      // Smoothly scroll to the FIRST invalid field so the user can begin filling them in
      const firstEl = document.getElementById(errors[0].id);
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          try {
            firstEl.focus();
            if (typeof firstEl.select === "function" && firstEl.value) {
              firstEl.select();
            }
          } catch { }
        }, 220);
      }

      // Display informative error summary
      const errLabels = errors.map(e => e.label);
      const displayedLabels = errLabels.length <= 4 
        ? errLabels.join(", ") 
        : `${errLabels.slice(0, 4).join(", ")} and ${errLabels.length - 4} more`;
      setOrderErrMsg(`Please fill in all ${errors.length} highlighted required field(s): ${displayedLabels}`);

      return;
    }

    // All validations passed! Proceed with saving order.
    setConfirmingOrder(true);
    try {
      const res = await confirmOrder({
        order: {
          type: order.type,
          L: Number(order.L) || 0,
          W: Number(order.W) || 0,
          H: Number(order.H) || 0,
          Q: Number(order.Q) || 1,
          J: Number(order.J) || 0,
          unit,
        },
        board: {
          ply,
          plies,
          flutes: fluteRows,
          tolAll,
          tolRows,
          extra: quote.extra,
        },
        pricing: {
          conv: quote.conv,
          marg: quote.marg,
          tax: quote.tax,
          discount: Number(orderDiscount ?? 0),
          trans: Number(quote.trans ?? 0),
          extra: quote.extra,
        },
      });

      if (res?.order) {
        setOrderSuccessMsg(`Order ${res.order.orderNumber} confirmed successfully! Total: ₹${fmtMoney(res.order.finalOrderPrice)}`);
        setOrdersList(prev => [res.order, ...prev.filter(o => o._id !== res.order._id)]);
        setTimeout(() => setOrderSuccessMsg(""), 6000);
      }
    } catch (err) {
      setOrderErrMsg(err.message || "Failed to confirm order");
    } finally {
      setConfirmingOrder(false);
    }
  };

  const handleLoadOrderIntoCalculator = (ord) => {
    if (!ord) return;
    if (ord.box) {
      setOrder({
        type: ord.box.type || "rsc",
        L: ord.box.L || 400,
        W: ord.box.W || 300,
        H: ord.box.H || 250,
        Q: ord.box.Q || 1000,
        J: ord.box.J || 35,
      });
      if (ord.box.unit) setUnit(ord.box.unit);
    }
    if (ord.board) {
      if (ord.board.ply) setPly(ord.board.ply);
      if (Array.isArray(ord.board.plies) && ord.board.plies.length > 0) {
        setPlies(ord.board.plies);
      }
      if (ord.board.tolerances?.tolAll !== undefined) {
        setTolAll(ord.board.tolerances.tolAll);
      }
    }
    if (ord.pricing) {
      setQuote(prev => ({
        ...prev,
        trans: ord.pricing.trans !== undefined ? ord.pricing.trans : prev.trans,
        extra: ord.pricing.extra !== undefined ? ord.pricing.extra : prev.extra,
      }));
      // Restore the per-order discount from the saved order (does NOT touch vendor quotation rates)
      if (ord.pricing.discount !== undefined) setOrderDiscount(ord.pricing.discount);
    }
    setOrderHistoryOpen(false);
  };

  const handleSaveQuotationSettings = async (e) => {
    if (e) e.preventDefault();
    setSettingsSaving(true);
    setSettingsMsg("");
    setSettingsErr("");
    try {
      const res = await updateQuotation({
        conversion: Number(modalConv),
        profitMargin: Number(modalMarg),
        tax: Number(modalTax),
        conv: Number(modalConv),
        marg: Number(modalMarg),
      });
      const updated = res?.quotation || res?.settings || {};
      const newConv = updated.conversion !== undefined ? updated.conversion : (updated.conv !== undefined ? updated.conv : Number(modalConv));
      const newMarg = updated.profitMargin !== undefined ? updated.profitMargin : (updated.marg !== undefined ? updated.marg : Number(modalMarg));
      const newTax = updated.tax !== undefined ? updated.tax : Number(modalTax);

      setQuote(prev => ({
        ...prev,
        conv: newConv,
        marg: newMarg,
        tax: newTax,
      }));
      setSettingsMsg("Quotation rates updated successfully!");
      setTimeout(() => {
        setQuotationModalOpen(false);
        setSettingsMsg("");
      }, 1000);
    } catch (err) {
      setSettingsErr(err.message || "Failed to save quotation rates");
    } finally {
      setSettingsSaving(false);
    }
  };

  /* Destructive bulk actions open a warning modal before running. */
  const [confirmBox, setConfirmBox] = useState(null); // {kind, run}
  const askConfirm = (kind, run, n = 0) => () => setConfirmBox({ kind, run, n });
  const [fluteSel, setFluteSel] = useState(() => new Set());
  const [reelSel, setReelSel] = useState(() => new Set());
  const [paperSel, setPaperSel] = useState(() => new Set());
  const toggleSel = setFn => key => e => {
    const on = e.target.checked;
    setFn(old => {
      const s = new Set(old);
      if (on) s.add(key);
      else s.delete(key);
      return s;
    });
  };
  const resetFlutes = async () => {
    try {
      const fresh = await resetFlutesApi();
      setFluteRows(fresh && fresh.length > 0 ? fresh : FLUTES);
      setFluteSel(new Set());
    } catch (err) {
      alert(err.message || "Failed to reset flutes");
    }
  };
  const delSelFlutes = async () => {
    const idsToDelete = fluteRows.filter((_, i) => fluteSel.has(i)).map(f => f._id).filter(Boolean);
    try {
      if (idsToDelete.length > 0) {
        await bulkDeleteFlutes(idsToDelete);
      }
      setFluteRows(old => old.filter((_, i) => !fluteSel.has(i)));
      setFluteSel(new Set());
    } catch (err) {
      alert(err.message || "Failed to delete selected flutes");
    }
  };
  const delSelReels = async () => {
    const selectedReels = reels.filter(r => reelSel.has(r.id) || reelSel.has(r._id));
    const idsToDelete = selectedReels.map(r => r._id).filter(Boolean);
    try {
      if (idsToDelete.length > 0) {
        await bulkDeleteReels(idsToDelete);
      }
      const gone = new Set(selectedReels.map(r => String(r.id || r._id)));
      setReels(old => old.filter(r => !reelSel.has(r.id) && !reelSel.has(r._id)));
      setReelSel(new Set());
      setPlies(old => old.map(p => (gone.has(String(p.reelId)) ? { ...p, reelId: "", price: "" } : p)));
    } catch (err) {
      alert(err.message || "Failed to delete selected reels");
    }
  };
  const delSelPapers = async () => {
    const idsToDelete = [...paperSel];
    try {
      if (idsToDelete.length > 0) {
        await bulkDeletePaperGrades(idsToDelete);
      }
      setPaperRows(old => old.filter(p => !paperSel.has(String(p._id))));
      setPaperSel(new Set());
    } catch (err) {
      alert(err.message || "Failed to delete selected papers");
    }
  };

  const liveSheet = useMemo(() => {
    const l = Number(order.L) || 0;
    const w = Number(order.W) || 0;
    const h = Number(order.H) || 0;
    const j = Number(order.J) || 0;
    const t = Number(tolAll) || 0;
    if (!l || !w || !h) return { length: 0, width: 0, area: 0, reelWidthNeeded: 0, scoreTol: t };
    let blankLength = 0;
    let blankWidth = 0;
    switch ((order.type || "rsc").toLowerCase()) {
      case "hsc":
        blankLength = Math.round(2 * (l + w) + 4 * t + j);
        blankWidth = Math.round(w / 2 + h + t);
        break;
      case "fol":
        blankLength = Math.round(2 * (l + w) + 4 * t + j);
        blankWidth = Math.round(2 * w + h + 2 * t);
        break;
      case "tel":
      case "telescope":
        blankLength = Math.round(2 * (l + 2 * h + 2 * t));
        blankWidth = Math.round(w + 2 * h + 2 * t);
        break;
      case "fld":
      case "folder":
      case "one piece folder":
        blankLength = Math.round(2 * l + 2 * h + 2 * t + j);
        blankWidth = Math.round(w + 2 * h + 2 * t);
        break;
      case "rsc":
      default:
        blankLength = Math.round(2 * (l + w) + 4 * t + j);
        blankWidth = Math.round(w + h + 2 * t);
        break;
    }
    const area = Number(((blankLength * blankWidth) / 1000000).toFixed(4));
    return {
      length: blankLength,
      width: blankWidth,
      area,
      reelWidthNeeded: blankWidth,
      scoreTol: t,
    };
  }, [order.L, order.W, order.H, order.J, order.type, tolAll]);

  const reqReelW = useMemo(() => {
    return liveSheet.width || 574;
  }, [liveSheet]);

  const top5Reels = useMemo(() => {
    if (!Array.isArray(reels) || reels.length === 0 || !reqReelW || reqReelW <= 0) return [];
    return [...reels]
      .filter(r => r && Number(r.w) >= reqReelW) // Only reels that actually fit the cutout width!
      .map(r => {
        const wNum = Number(r.w) || 0;
        const blanks = Math.floor(wNum / reqReelW);
        const waste = Math.round((wNum - blanks * reqReelW) * 100) / 100;
        return { ...r, w: wNum, blanks, waste };
      })
      .sort((a, b) => a.waste - b.waste)
      .slice(0, 5);
  }, [reels, reqReelW]);

  const liveSummary = useMemo(() => {
    const sheetArea = liveSheet.area;
    if (!sheetArea || sheetArea <= 0) {
      return {
        boxWeight: "—",
        orderWeight: "—",
        overallBS: "—",
        ply: `${ply} ply`,
        blanksPerReel: "—",
      };
    }

    let totalBoardGSM = 0;
    let totalBS = 0;

    for (let i = 0; i < ply; i++) {
      const isLiner = role(i) === "liner";
      const p = plies[i] || {};
      const gsm = Number(p.gsm) || 0;
      const bf = Number(p.bf) || 0;
      const fluteFactor = fluteRows.find(f => f.n === p.flute)?.f || 1.32;
      const takeUp = isLiner ? 1.0 : Number(fluteFactor);

      totalBoardGSM += gsm * takeUp;

      const plyBS = (gsm * bf) / 1000;
      totalBS += isLiner ? plyBS : plyBS * 0.8;
    }

    if (totalBoardGSM <= 0) {
      return {
        boxWeight: "—",
        orderWeight: "—",
        overallBS: "—",
        ply: `${ply} ply`,
        blanksPerReel: "—",
      };
    }

    const fluteLayers = Math.floor(ply / 2);
    const starchGSM = fluteLayers * 20;
    const boxWeightKg = Number(((sheetArea * (totalBoardGSM + starchGSM)) / 1000).toFixed(3));
    const orderWeightKg = Math.round(boxWeightKg * (Number(order.Q) || 0));
    const bsVal = Number(totalBS.toFixed(2));

    const bestReelW = top5Reels[0]?.w || reels.find(r => r && Number(r.w) >= liveSheet.width)?.w;
    const blanksPerReel = bestReelW && liveSheet.width > 0
      ? `${Math.floor(bestReelW / liveSheet.width)} out (${lenText(bestReelW, unit)} ${unitLabel(unit)} reel)`
      : liveSheet.width > 0
      ? `1 out (min ${lenText(liveSheet.width, unit)} ${unitLabel(unit)})`
      : "—";

    return {
      boxWeight: `${boxWeightKg} kg`,
      orderWeight: `${fmt(orderWeightKg)} kg`,
      overallBS: `${bsVal} kg/cm²`,
      ply: `${ply} ply`,
      blanksPerReel,
    };
  }, [liveSheet, ply, plies, fluteRows, order.Q, top5Reels, reels, unit]);

  /* Live Reactive Quotation Engine (0ms instant updates) */
  const liveQuote = useMemo(() => {
    const sheetArea = liveSheet.area;
    const Q = Number(order.Q) || 0;

    let paperCostPerBox = 0;
    if (sheetArea > 0) {
      for (let i = 0; i < ply; i++) {
        const isLiner = role(i) === "liner";
        const p = plies[i] || {};
        const gsm = Number(p.gsm) || 0;
        const fluteFactor = fluteRows.find(f => f.n === p.flute)?.f || 1.32;
        const takeUp = isLiner ? 1.0 : Number(fluteFactor);
        const pricePerKg = Number(p.price) >= 0 ? Number(p.price) : 0;
        const plyWeightGsm = gsm * takeUp;
        const plyWeightKg = (sheetArea * plyWeightGsm) / 1000;
        const plyCost = plyWeightKg * pricePerKg;
        paperCostPerBox += plyCost;
      }
    }
    paperCostPerBox = Math.round(paperCostPerBox * 100) / 100;

    const wastagePct = Number(quote.extra) >= 0 ? Number(quote.extra) : 5;
    const wastagePerBox = Math.round(paperCostPerBox * (wastagePct / 100) * 100) / 100;
    const paperCostWithWastage = paperCostPerBox + wastagePerBox;

    const conversionPerBox = Number(quote.conv) >= 0 ? Number(quote.conv) : 2;
    const marginPct = Number(quote.marg) >= 0 ? Number(quote.marg) : 10;
    const baseCostBeforeMargin = paperCostWithWastage + conversionPerBox;
    const marginAmountPerBox = Math.round(baseCostBeforeMargin * (marginPct / 100) * 100) / 100;
    const costPerBoxWithMargin = Math.round((baseCostBeforeMargin + marginAmountPerBox) * 100) / 100;

    const totalPcsCost = Math.round(costPerBoxWithMargin * Q * 100) / 100;

    const discountPct = Number(orderDiscount) >= 0 ? Number(orderDiscount) : 0;
    const discountAmount = Math.round(totalPcsCost * (discountPct / 100) * 100) / 100;
    const totalAfterDiscount = Math.round((totalPcsCost - discountAmount) * 100) / 100;

    const transportCost = Number(quote.trans) >= 0 ? Number(quote.trans) : 0;
    const taxPct = Number(quote.tax) >= 0 ? Number(quote.tax) : 5;
    const taxableAmount = totalAfterDiscount + transportCost;
    const taxAmount = Math.round(taxableAmount * (taxPct / 100) * 100) / 100;

    const finalOrderPrice = Math.round((taxableAmount + taxAmount) * 100) / 100;

    return {
      paperCostPerBox,
      wastagePct,
      wastagePerBox,
      conversionPerBox,
      marginPct,
      costPerBoxWithMargin,
      quantity: Q,
      totalPcsCost,
      discountPct,
      discountAmount,
      totalAfterDiscount,
      transportCost,
      taxableAmount,
      taxPct,
      taxAmount,
      finalOrderPrice,
    };
  }, [liveSheet.area, order.Q, ply, plies, fluteRows, quote, orderDiscount]);

  const fluteOpts = useMemo(
    () => (
      <>
        <option value="__new_flute__">+ New flute</option>
        <option value="">— select flute —</option>
        {fluteRows.map(f => (
          <option key={f.n} value={f.n}>
            {f.n} · {Number(f.f).toFixed(2)}
          </option>
        ))}
      </>
    ),
    [fluteRows]
  );

  const reelOpts = useMemo(
    () => {
      const hasReels = Array.isArray(reels) && reels.length > 0;
      const hasTop5 = Array.isArray(top5Reels) && top5Reels.length > 0;

      return (
        <>
          <option value="__new_reel__">+ New reel</option>
          <option value="">— pick a reel (optional) —</option>

          {hasTop5 && (
            <optgroup label="Top 5 Recommended (Closest Fit)">
              {top5Reels.map(r => (
                <option key={`top-${r.id || r._id}`} value={r.id || r._id}>
                  ★ {r.paperGrade ? `${r.paperGrade} · ` : ""}{lenText(r.w, unit)} {unitLabel(unit)} · {r.gsm}gsm · BF{r.bf} · ₹{r.price}/kg ({r.blanks} out · {lenText(r.waste, unit)} {unitLabel(unit)} trim)
                </option>
              ))}
            </optgroup>
          )}

          {hasReels && (
            <optgroup label="All Inventory">
              {reels.map(r => {
                const fits = Number(r.w) >= reqReelW;
                const blanks = Math.floor(r.w / reqReelW);
                const fitLabel = fits ? `(${blanks} out)` : `(too narrow, needs ${lenText(reqReelW, unit)} ${unitLabel(unit)})`;
                return (
                  <option key={r.id || r._id} value={r.id || r._id}>
                    {r.paperGrade ? `${r.paperGrade} · ` : ""}{lenText(r.w, unit)} {unitLabel(unit)} · {r.gsm}gsm · BF{r.bf} · ₹{r.price}/kg · {fitLabel}
                  </option>
                );
              })}
            </optgroup>
          )}
        </>
      );
    },
    [top5Reels, reels, reqReelW, unit]
  );

  if (checkingAuth) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <nav>
          <div className="logo"><i />BoxCalc</div>
        </nav>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 16px",
          }}
        >
          <HourglassLoader size={54} label="Loading BoxCalc…" />
        </div>
      </div>
    );
  }

  return (
    <>
      <nav>
        <div className="logo"><i />BoxCalc</div>
        <div className="nr">
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                className="vendor-user-btn"
                onClick={() => setSidebarOpen(true)}
                title="Click to open menu"
                aria-label="Open sidebar menu"
              >
                {user.role === "vendor" ? "Vendor" : "Staff"} : {user.name}
              </button>
              {user.role === "vendor" && (
                <button
                  type="button"
                  className="btn pri desktop-only"
                  onClick={openStaffModal}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                  }}
                >
                  + Invite Staff
                </button>
              )}
              <button
                type="button"
                className="btn desktop-only"
                onClick={handleLogout}
                style={{ padding: "4px 8px", fontSize: "12px" }}
              >
                Log out
              </button>
            </div>
          ) : (
            <Link href="/auth" className="btn pri">Login</Link>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="left">
          <h1>Order details</h1>
          <p className="sub">Inside dimensions. Switch between mm and inch — values convert automatically.</p>
          <div className="og">
            <label className="full">Box type
              <select
                name="type"
                value={order.type}
                onChange={e => {
                  const newType = e.target.value;
                  const def = BOX_TYPE_DEFAULTS[newType] || BOX_TYPE_DEFAULTS.rsc;
                  setOrder(o => ({ ...o, type: newType, L: def.L, W: def.W, H: def.H }));
                }}
              >
                {BOX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            {DIM_FIELDS.map(([k, label, minMM]) => (
              <label key={k}>{label}
                <div className="unit has-select">
                  <input
                    id={`input-order-${k}`}
                    name={k}
                    type="number"
                    inputMode="decimal"
                    min={unit === "mm" ? minMM : +(minMM / MM_PER_IN).toFixed(2)}
                    step={unit === "mm" ? "1" : "0.01"}
                    value={toDisp(order[k], unit)}
                    onChange={setDim(k)}
                  />
                  <UnitSelect unit={unit} onChange={changeUnit} label={`${label} unit`} />
                </div>
              </label>
            ))}
            <label>Quantity<div className="unit"><input id="input-order-Q" name="Q" type="number" min="1" step="1" value={order.Q} onChange={set(order, setOrder)} /><span>pcs</span></div></label>
            <label>Number of ply
              <select id="select-order-ply" value={ply} onChange={e => setPlyCount(+e.target.value)}>
                <option>3</option><option>5</option><option>7</option><option>9</option>
              </select>
            </label>
            <label>Joint allowance<div className="unit has-select"><input id="input-order-J" name="J" type="number" min="0" step={unit === "inch" ? "0.01" : "1"} value={toDisp(order.J, unit)} onChange={setDim("J")} /><UnitSelect unit={unit} onChange={changeUnit} label="Joint allowance unit" /></div></label>
          </div>
        </div>
        <BoxPreview type={order.type} L={order.L} W={order.W} H={order.H} J={order.J} unit={unit} />
      </section>

      <main id="calc">
        <h2>Calculator</h2>
        <p className="sub">Every figure updates as you change the order.</p>

        <div className="card">
          <h3>Board build – one row per ply</h3>
          <div className="scroll"><table>
            <thead>
              <tr><th>Ply</th><th>Paper quality (optional)</th><th>GSM</th><th>BF</th><th>Flute take-up</th><th>Reel from inventory (5 closest)</th><th>₹/kg</th><th>Cost</th></tr>
            </thead>
            <tbody>
              {plies.map((p, i) => {
                const sheetAreaM2 = liveSheet.area || 0;
                const fluteFactor = fluteRows.find(f => f.n === p.flute)?.f || 1.32;
                const takeUp = role(i) === "liner" ? 1.0 : Number(fluteFactor);
                const priceNum = Number(p.price) || 0;
                const gsmNum = Number(p.gsm) || 0;
                const livePlyCost = priceNum > 0 && gsmNum > 0 && sheetAreaM2 > 0
                  ? ((sheetAreaM2 * (gsmNum * takeUp)) / 1000) * priceNum
                  : 0;
                return (
                  <tr key={i}>
                    <td>{i + 1} {role(i) === "liner" ? "Liner" : "Flute"}</td>
                    <td>
                      <select value={p.paperName || ""} onChange={setPaper(i)} style={{ width: 140 }}>
                        <option value="">— pick a grade —</option>
                        {paperRows.map(pr => (
                          <option key={pr.name} value={pr.name}>{pr.name}</option>
                        ))}
                      </select>
                    </td>
                    <td><input id={`ply-gsm-${i}`} type="number" min="60" step="1" value={p.gsm} style={{ width: 76 }} onChange={setCell(i, "gsm")} /></td>
                    <td><input id={`ply-bf-${i}`} type="number" min="10" step="1" value={p.bf} style={{ width: 64 }} onChange={setCell(i, "bf")} /></td>
                    <td>{role(i) === "flute"
                      ? (
                        <select
                          value={p.flute || "B"}
                          style={{ width: 140 }}
                          onChange={e => {
                            if (e.target.value === "__new_flute__") {
                              openFlute(null, i);
                              return;
                            }
                            setCell(i, "flute")(e);
                          }}
                        >
                          {fluteOpts}
                        </select>
                      )
                      : <span className="note">1.00 (liner)</span>}</td>
                    <td>
                      <select
                        value={p.reelId || ""}
                        style={{ minWidth: 260 }}
                        onChange={setReel(i)}
                      >
                        {reelOpts}
                      </select>
                    </td>
                    <td>
                      <input
                        id={`ply-price-${i}`}
                        type="number"
                        min="0"
                        step="0.5"
                        value={p.price}
                        placeholder="—"
                        style={{ width: 90 }}
                        onChange={setPrice(i)}
                        title={!p.reelId && p.price !== "" ? "Manual price (no reel selected)" : "Paper cost per kg in ₹"}
                      />
                    </td>
                    <td>
                      {livePlyCost > 0 ? `₹${fmtMoney(livePlyCost, 2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          <div className="row" style={{ marginTop: 14 }}>
            <label style={{ maxWidth: 220 }}>Score tolerance (whole board)<div className="unit has-select"><input id="input-score-tol" type="number" min="0" step={unit === "inch" ? "0.01" : "1"} value={toDisp(tolAll, unit)} onChange={e => setTolAll(toMM(e.target.value, unit) || 0)} /><UnitSelect unit={unit} onChange={changeUnit} label="Score tolerance unit" /></div></label>
            <label style={{ maxWidth: 220 }}>Overall Wastage<div className="unit"><input id="input-overall-wastage" name="extra" type="number" min="0" max="100" step="1" value={quote.extra} onChange={set(quote, setQuote)} /><span>%</span></div></label>
          </div>
        </div>

        <div className="grid3">
          <div className="card">
            <h3>Sheet</h3>
            {liveSheet.length > 0 ? (
              <>
                {kv("Sheet size", `${lenText(liveSheet.length, unit)} × ${lenText(liveSheet.width, unit)} ${unitLabel(unit)}`, "sheet-size")}
                {kv("Sheet area", `${liveSheet.area} m²`, "sheet-area")}
                {kv("Reel width needed", `${lenText(liveSheet.reelWidthNeeded, unit)} ${unitLabel(unit)} or more`, "sheet-reel")}
                {kv("Score tolerance", `${lenText(liveSheet.scoreTol, unit)} ${unitLabel(unit)} per score`, "sheet-tol")}
              </>
            ) : (
              <div style={{ color: "var(--mute)", fontSize: 13, padding: "14px 0" }}>Enter dimensions above</div>
            )}
          </div>
          <div className="card" id="quotation-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Quotation</h3>
              {user?.role === "vendor" && (
                <button
                  type="button"
                  onClick={() => {
                    setModalConv(quote.conv);
                    setModalMarg(quote.marg);
                    setModalTax(quote.tax);
                    setSettingsMsg("");
                    setSettingsErr("");
                    setQuotationModalOpen(true);
                  }}
                  className="edit-rates-btn"
                  title="Edit company conversion, margin, GST, and discount rates"
                >
                  Edit rates ⚙
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: 14 }}>
              <label>
                Transport ₹
                <input
                  id="input-transport-cost"
                  name="trans"
                  type="number"
                  min="0"
                  step="1"
                  value={quote.trans}
                  onChange={set(quote, setQuote)}
                  title="Adjust transport cost for this order"
                />
              </label>

              <label>
                Discount %
                <input
                  name="discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={orderDiscount}
                  onChange={e => setOrderDiscount(e.target.value)}
                  title="Customer-specific discount % for this order only — not saved to your default rates"
                />
              </label>
            </div>

            {kv("Paper cost / box", `₹${fmtMoney(liveQuote.paperCostPerBox, 2)}`, "qc-paper")}
            {kv(`Wastage (${liveQuote.wastagePct}%)`, `₹${fmtMoney(liveQuote.wastagePerBox, 2)}`, "qc-wastage")}
            {kv("Conversion / box", `₹${fmtMoney(liveQuote.conversionPerBox, 2)}`, "qc-conv")}
            {kv(`Cost / box with margin (${liveQuote.marginPct}%)`, `₹${fmtMoney(liveQuote.costPerBoxWithMargin, 2)}`, "qc-box-marg")}
            {kv(`Total (${fmt(liveQuote.quantity || order.Q)} pcs)`, `₹${fmtMoney(liveQuote.totalPcsCost)}`, "qc-total-pcs")}
            {Number(liveQuote.discountPct) > 0 && kv(`Discount (${liveQuote.discountPct}%)`, `-₹${fmtMoney(liveQuote.discountAmount)}`, "qc-discount")}
            {kv("Transport", `₹${fmtMoney(liveQuote.transportCost)}`, "qc-trans")}
            {kv("Taxable subtotal", `₹${fmtMoney(liveQuote.taxableAmount)}`, "qc-taxable")}
            {kv(`Tax (${liveQuote.taxPct}%)`, `₹${fmtMoney(liveQuote.taxAmount)}`, "qc-tax")}
            <div className="kv" key="qc-final">
              <span>Final order price</span>
              <span className="big">₹{fmtMoney(liveQuote.finalOrderPrice)}</span>
            </div>

            {orderErrMsg && (
              <div className="err" style={{ marginTop: 8 }}>
                {orderErrMsg}
              </div>
            )}
            {orderSuccessMsg && (
              <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(22, 163, 74, 0.1)", border: "1px solid rgba(22, 163, 74, 0.3)", borderRadius: "6px", fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>
                ✓ {orderSuccessMsg}
              </div>
            )}

            <button
              type="button"
              className="btn pri"
              disabled={confirmingOrder}
              onClick={handleConfirmOrder}
              style={{
                width: "100%",
                marginTop: 14,
                padding: "9px 14px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {confirmingOrder ? "Confirming order…" : "Confirm order"}
            </button>
          </div>
          <div className="card">
            <h3>Box summary</h3>
            {kv("Weight of 1 box", liveSummary.boxWeight, "bs-box-wt")}
            {kv("Weight of order", liveSummary.orderWeight, "bs-order-wt")}
            {kv("Overall BS", liveSummary.overallBS, "bs-bs")}
            {kv("Board", liveSummary.ply, "bs-board")}
            {kv("Blanks per reel width", liveSummary.blanksPerReel, "bs-blanks")}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="tabs" role="tablist">
            {[["flute", "Flute table"], ["inv", "Reel inventory"], ["tol", "Score tolerance"], ["paper", "Paper"]].map(([k, label]) => (
              <button key={k} className="tab" role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>

          {tab === "flute" && (
            <div role="tabpanel">
              <div className="row" style={{ alignItems: "center", marginBottom: 6 }}>
                <span className="note" style={{ flex: 2, margin: 0, minWidth: 200 }}>Flute profiles define the take-up factor and standard thickness range.</span>
                <button type="button" style={{ flex: "none" }} onClick={askConfirm("flute-reset", resetFlutes)}>Reset to default</button>
                <button type="button" className={fluteSel.size ? "danger" : ""} style={{ flex: "none" }} disabled={!fluteSel.size} onClick={askConfirm("flute-del", delSelFlutes, fluteSel.size)}>{`Delete selected (${fluteSel.size})`}</button>
                <button type="button" className="pri" style={{ flex: "none" }} onClick={() => openFlute()}>+ Add flute</button>
              </div>
              <div className="scroll"><table style={{ minWidth: 560 }}>
                <thead><tr><th style={{ width: 32 }}><input type="checkbox" aria-label="Select all flutes" checked={fluteRows.length > 0 && fluteSel.size === fluteRows.length} onChange={e => setFluteSel(new Set(e.target.checked ? fluteRows.map((_, i) => i) : []))} /></th><th>Flute</th><th>Take-up</th><th>Thickness <UnitSelect unit={unit} onChange={changeUnit} className="unitpick" label="Thickness unit" /></th><th>Used for</th><th></th></tr></thead>
                <tbody>
                  {fluteRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "32px 16px", color: "var(--mute)", fontSize: 13 }}>
                        No flutes added yet. Click <strong>"+ Add flute"</strong> to add a custom profile or <strong>"Reset to default"</strong> to load industry standards.
                      </td>
                    </tr>
                  ) : (
                    fluteRows.map((f, k) => (
                      <tr key={f._id || (f.n + k)}>
                        <td><input type="checkbox" aria-label={`Select ${f.n}`} checked={fluteSel.has(k)} onChange={toggleSel(setFluteSel)(k)} /></td>
                        <td><b>{f.n}</b></td>
                        <td>{Number(f.f).toFixed(2)}</td>
                        <td>{f.th ? rangeDisp(f.th, unit) : "–"}</td>
                        <td>{f.d || "–"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button type="button" style={{ padding: "4px 8px" }} onClick={() => openFlute(k)}>Edit</button>{" "}
                          <button type="button" style={{ padding: "4px 8px" }} onClick={() => delFlute(k)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table></div>
            </div>
          )}

          {tab === "inv" && (
            <div role="tabpanel">
              <div className="row" style={{ alignItems: "end", marginBottom: 10 }}>
                <label style={{ maxWidth: 260 }}>Search<input placeholder="Width, GSM or BF, e.g. 150" value={reelSearch} onChange={e => setReelSearch(e.target.value)} /></label>
                <button type="button" className={reelSel.size ? "danger" : ""} style={{ flex: "none" }} disabled={!reelSel.size} onClick={askConfirm("reel-del", delSelReels, reelSel.size)}>{`Delete selected (${reelSel.size})`}</button>
                <button type="button" className="pri" style={{ flex: "none" }} onClick={() => openReel()}>+ Add reel</button>
              </div>
              <div className="scroll" style={{ maxHeight: 380, overflowY: "auto" }}><table className="inv" style={{ minWidth: 700 }}>
                <thead><tr><th style={{ width: 32 }}><input type="checkbox" aria-label="Select all reels" checked={displayReels.length > 0 && reelSel.size === displayReels.length} onChange={e => setReelSel(new Set(e.target.checked ? displayReels.map(r => r.id || r._id) : []))} /></th><th>Width <UnitSelect unit={unit} onChange={changeUnit} className="unitpick" label="Reel width unit" /></th><th>Paper Grade</th><th>GSM</th><th>BF</th><th>₹/kg</th><th>Stock (kg)</th><th></th></tr></thead>
                <tbody>
                  {displayReels.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "32px 16px", color: "var(--mute)", fontSize: 13 }}>
                        {reels.length === 0
                          ? 'No reels in inventory yet. Click "+ Add reel" to add your paper stock.'
                          : "No reels match your search."}
                      </td>
                    </tr>
                  ) : (
                    displayReels.map(r => (
                      <tr key={r.id || r._id}>
                        <td><input type="checkbox" aria-label={`Select reel ${r.w}`} checked={reelSel.has(r.id) || reelSel.has(r._id)} onChange={toggleSel(setReelSel)(r.id || r._id)} /></td>
                        <td><input type="number" min={unit === "inch" ? "4" : "100"} step={unit === "inch" ? "0.01" : "1"} style={{ width: 100 }} aria-label={`Reel width in ${unitLabel(unit)}`} value={toDisp(r.w, unit)} onChange={setReelW(r.id || r._id)} onBlur={e => handleReelWBlur(r.id || r._id, toMM(e.target.value, unit))()} /></td><td style={{ color: "var(--mute)" }}>{r.paperGrade || "—"}</td><td>{r.gsm}</td><td>{r.bf}</td><td>₹{r.price}</td><td>{fmt(r.stock)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button type="button" style={{ padding: "4px 8px" }} onClick={() => openReel(r.id || r._id)}>Edit</button>{" "}
                          <button type="button" style={{ padding: "4px 8px" }} onClick={() => delReel(r.id || r._id)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table></div>
            </div>
          )}

          {tab === "tol" && (
            <div role="tabpanel">
              <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
                <p className="note" style={{ flex: 1, margin: 0 }}>Default score tolerance for each ply count. The board field above starts from these values, and you can still override it for a single order.</p>
                <button type="button" style={{ flex: "none" }} onClick={askConfirm("tol-reset", handleResetTolerances)}>Reset to default</button>
              </div>
              <div className="scroll"><table style={{ width: "auto", minWidth: 400, borderCollapse: "collapse" }}>
                <thead><tr><th style={{ width: 100, paddingRight: 16 }}>Ply</th><th style={{ width: 180, paddingRight: 16 }}>Score tolerance</th><th style={{ width: 90 }}></th></tr></thead>
                <tbody>
                  {Object.keys(tolRows).length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", padding: "28px 16px", color: "var(--mute)", fontSize: 13 }}>
                        No score tolerances set. Click <strong>"Reset to default"</strong> to load industry defaults (6mm, 12mm, 18mm, 24mm).
                      </td>
                    </tr>
                  ) : (
                    Object.keys(tolRows).sort((a, b) => Number(a) - Number(b)).map(p => {
                      const isDirty = (() => {
                        if (savedTolRows[p] === undefined) return false;
                        if (tolRows[p] === "" && savedTolRows[p] === "") return false;
                        if (tolRows[p] === "" || savedTolRows[p] === "") return true;
                        return Number(tolRows[p]) !== Number(savedTolRows[p]);
                      })();
                      return (
                        <tr key={p}>
                          <td style={{ width: 100, paddingRight: 16 }}><b>{p} ply</b></td>
                          <td style={{ width: 180, paddingRight: 16 }}>
                            <div className="unit has-select" style={{ width: 150 }}>
                              <input
                                type="number"
                                min="0"
                                step={unit === "inch" ? "0.01" : "1"}
                                value={toDisp(tolRows[p], unit)}
                                onChange={handleTolChange(p)}
                              />
                              <UnitSelect unit={unit} onChange={changeUnit} label={`Score tolerance unit for ${p} ply`} />
                            </div>
                          </td>
                          <td style={{ width: 90, whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              className={isDirty ? "pri" : ""}
                              style={{ padding: "4px 14px", minWidth: 60, transition: "all 0.15s ease" }}
                              disabled={savingTol === p}
                              onClick={() => handleSaveTolRow(p)}
                            >
                              {savingTol === p ? "Saving…" : savedTol === p ? "✓ Saved" : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table></div>
            </div>
          )}
          {tab === "paper" && (
            <div role="tabpanel">
              <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
                <p className="note" style={{ flex: 1, margin: 0 }}>Default paper grades used to auto-fill GSM and BF.</p>
                <button type="button" style={{ flex: "none" }} onClick={askConfirm("paper-reset", async () => {
                  const res = await resetPaperGradesApi();
                  setPaperRows(res || []);
                  setPaperSel(new Set());
                })}>Reset to default</button>
                <button type="button" className={paperSel.size ? "danger" : ""} style={{ flex: "none" }} disabled={!paperSel.size} onClick={askConfirm("paper-del-bulk", delSelPapers, paperSel.size)}>{`Delete selected (${paperSel.size})`}</button>
                <button type="button" className="pri" style={{ flex: "none" }} onClick={() => openPaper()}>+ Add paper grade</button>
              </div>
              <div className="scroll"><table style={{ minWidth: 400 }}>
                <thead><tr><th style={{ width: 32 }}><input type="checkbox" aria-label="Select all paper grades" checked={paperRows.length > 0 && paperSel.size === paperRows.length} onChange={e => setPaperSel(new Set(e.target.checked ? paperRows.map(p => String(p._id)) : []))} /></th><th>Paper Type</th><th>GSM</th><th>BF</th><th></th></tr></thead>
                <tbody>
                  {paperRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "28px 16px", color: "var(--mute)", fontSize: 13 }}>
                        No paper grades set. Click <strong>"Reset to default"</strong> to load standards.
                      </td>
                    </tr>
                  ) : (
                    paperRows.map(p => (
                      <tr key={p._id}>
                        <td><input type="checkbox" aria-label={`Select ${p.name}`} checked={paperSel.has(String(p._id))} onChange={toggleSel(setPaperSel)(String(p._id))} /></td>
                        <td><b>{p.name}</b></td>
                        <td>{p.gsm}</td>
                        <td>{p.bf}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button type="button" style={{ padding: "4px 8px" }} onClick={() => openPaper(p._id)}>Edit</button>{" "}
                          <button type="button" style={{ padding: "4px 8px" }} onClick={askConfirm("paper-del", () => delPaper(p._id), 1)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table></div>
            </div>
          )}
        </div>
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
          {dialogErr && <div className="err" style={{ marginTop: 12, marginBottom: 0 }}>{dialogErr}</div>}
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" style={{ flex: "none" }} onClick={() => setDialog(null)}>Cancel</button>
            <button type="button" className="pri" style={{ flex: "none" }} onClick={saveFlute}>{dialog.edit != null ? "Save flute" : "Add flute"}</button>
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
            <label className="full">Reel width<div className="unit has-select"><input name="w" type="number" min={unit === "inch" ? "4" : "100"} step={unit === "inch" ? "0.01" : "1"} placeholder={unit === "inch" ? "e.g. 59.06" : "e.g. 1500"} value={toDisp(reelForm.w, unit)} onChange={e => setReelForm(f => ({ ...f, w: toMM(e.target.value, unit) }))} /><UnitSelect unit={unit} onChange={changeUnit} label="Reel width unit" /></div></label>
            <label className="full">Paper Grade (optional)
              <select name="pg" value={reelForm.pg} onChange={setReelPaper}>
                <option value="">— pick a grade —</option>
                {paperRows.map(p => <option key={p._id} value={p.name}>{p.name}</option>)}
              </select>
            </label>
            <label>GSM<input name="g" type="number" min="20" step="1" placeholder="e.g. 150" value={reelForm.g} onChange={set(reelForm, setReelForm)} /></label>
            <label>BF<input name="b" type="number" min="1" step="1" placeholder="e.g. 20" value={reelForm.b} onChange={set(reelForm, setReelForm)} /></label>
            <label>Price per kg (₹)<input name="p" type="number" min="1" step="1" placeholder="e.g. 42" value={reelForm.p} onChange={set(reelForm, setReelForm)} /></label>
            <label>Stock in kg (optional)<input name="s" type="number" min="0" step="1" value={reelForm.s} onChange={set(reelForm, setReelForm)} /></label>
          </div>
          {dialogErr && <div className="err" style={{ marginTop: 12, marginBottom: 0 }}>{dialogErr}</div>}
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" style={{ flex: "none" }} onClick={() => setDialog(null)}>Cancel</button>
            <button type="button" className="pri" style={{ flex: "none" }} onClick={saveReel}>{dialog.edit != null ? "Save reel" : "Add reel"}</button>
          </div>
        </Modal>
      )}

      {dialog?.kind === "paper" && (
        <Modal onDismiss={() => setDialog(null)}>
          <h3 style={{ fontSize: 16 }}>{dialog.edit != null ? "Edit paper grade" : "Add a paper grade"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="full">Paper Grade Name<input name="n" placeholder="e.g. Virgin Kraft" value={paperForm.n} onChange={set(paperForm, setPaperForm)} /></label>
            <label>GSM<input name="g" type="number" min="20" step="1" placeholder="e.g. 150" value={paperForm.g} onChange={set(paperForm, setPaperForm)} /></label>
            <label>BF<input name="b" type="number" min="1" step="1" placeholder="e.g. 24" value={paperForm.b} onChange={set(paperForm, setPaperForm)} /></label>
          </div>
          {dialogErr && <div className="err" style={{ marginTop: 12, marginBottom: 0 }}>{dialogErr}</div>}
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" style={{ flex: "none" }} onClick={() => setDialog(null)}>Cancel</button>
            <button type="button" className="pri" style={{ flex: "none" }} onClick={savePaper}>{dialog.edit != null ? "Save" : "Add"}</button>
          </div>
        </Modal>
      )}

      {staffModalOpen && (
        <Modal onDismiss={() => setStaffModalOpen(false)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ fontSize: "16px", margin: 0, fontWeight: "700" }}>Manage Staff</h3>
            <button
              type="button"
              onClick={() => setStaffModalOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--mute)", fontSize: "18px", cursor: "pointer", padding: "0 4px" }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="note" style={{ margin: "0 0 14px 0", fontSize: "12px" }}>
            Invited staff can log in at <b>/auth</b> using their email as username and temporary password, then reset it anytime.
          </p>

          <form onSubmit={handleInviteStaff} style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <label style={{ flex: 1 }}>
                Staff name
                <input
                  type="text"
                  placeholder="e.g. Alex Smith"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                />
              </label>
              <label style={{ flex: 1.2 }}>
                Staff email
                <input
                  type="email"
                  required
                  placeholder="staff@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={inviteBusy}
                className="btn pri"
                style={{ padding: "6px 14px", height: "34px", whiteSpace: "nowrap", flex: "none" }}
              >
                {inviteBusy ? "Inviting…" : "Invite"}
              </button>
            </div>

            {inviteMsg && (
              <div style={{ background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "6px", padding: "8px 10px", fontSize: "12px", color: "#4ade80" }}>
                {inviteMsg}
              </div>
            )}
            {inviteErr && (
              <div className="err" style={{ margin: 0 }}>
                {inviteErr}
              </div>
            )}
          </form>

          <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: "600", margin: 0 }}>
                Staff Members ({staffList.length})
              </h4>
            </div>

            {staffLoading ? (
              <p className="note">Loading staff list…</p>
            ) : staffList.length === 0 ? (
              <p className="note" style={{ fontStyle: "italic", margin: "4px 0" }}>No staff members invited yet.</p>
            ) : (
              <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {staffList.map(member => (
                  <div
                    key={member._id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--soft)",
                      border: "1px solid var(--line-soft)",
                      borderRadius: "6px",
                      padding: "7px 10px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "12.5px" }}>
                        {member.name || member.email.split("@")[0]}
                      </div>
                      <div style={{ color: "var(--mute)", fontSize: "11.5px" }}>
                        {member.email} · <span style={{ color: member.status === "active" ? "#4ade80" : "var(--mute)", textTransform: "capitalize" }}>{member.status}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStaff(member._id, member.email)}
                      className="btn"
                      style={{ padding: "3px 8px", fontSize: "11px", color: "#f87171", borderColor: "rgba(248, 113, 113, 0.3)" }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Sidebar Drawer from Right */}
      {sidebarOpen && (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="drawer" role="dialog" aria-label="Navigation drawer" aria-modal="true">
            <div className="drawer-header">
              <div className="drawer-header-info">
                <div className="drawer-header-title">
                  {user?.role === "vendor" ? "Vendor" : "Staff"} : {user?.name || "User"}
                </div>
                <div className="drawer-header-sub" title={user?.email}>
                  {user?.email}
                </div>
              </div>

              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close drawer"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="drawer-body">
              <button
                type="button"
                className="drawer-link"
                onClick={() => {
                  setSidebarOpen(false);
                  openOrderHistory();
                }}
              >
                Order History
              </button>

              {user?.role === "vendor" && (
                <button
                  type="button"
                  className="drawer-link"
                  onClick={() => {
                    setSidebarOpen(false);
                    setModalConv(quote.conv);
                    setModalMarg(quote.marg);
                    setModalTax(quote.tax);
                    setSettingsMsg("");
                    setSettingsErr("");
                    setQuotationModalOpen(true);
                  }}
                >
                  Quotation
                </button>
              )}

              {user?.role === "vendor" && (
                <button
                  type="button"
                  className="drawer-link"
                  onClick={handleSidebarInviteStaff}
                >
                  Invite Staff
                </button>
              )}

              <button
                type="button"
                className="drawer-link"
                onClick={handleOpenProfile}
              >
                Profile
              </button>
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                className="drawer-logout-btn"
                onClick={() => {
                  setSidebarOpen(false);
                  handleLogout();
                }}
              >
                Log out
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Quotation Settings Modal (Vendor Editable Table) */}
      {quotationModalOpen && (
        <Modal onDismiss={() => setQuotationModalOpen(false)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ fontSize: "16px", margin: 0, fontWeight: "700" }}>Quotation Settings</h3>
            <button
              type="button"
              onClick={() => setQuotationModalOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--mute)", fontSize: "18px", cursor: "pointer", padding: "0 4px" }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="note" style={{ margin: "0 0 14px 0", fontSize: "12px", lineHeight: "1.4" }}>
            {user?.role === "vendor"
              ? "Edit and save your company's conversion, margin, and tax rates once. These default rates will be locked and used by both yourself and all staff members for quotations."
              : "Base quotation rates configured by your vendor company. These rates are locked and read-only for staff."}
          </p>

          <form onSubmit={handleSaveQuotationSettings}>
            <div className="scroll" style={{ marginBottom: "14px" }}>
              <table style={{ minWidth: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 8px", fontSize: "12px", color: "var(--mute)" }}>Rate Parameter</th>
                    <th style={{ textAlign: "left", padding: "8px 8px", fontSize: "12px", color: "var(--mute)", width: "110px" }}>Value</th>
                    <th style={{ textAlign: "left", padding: "8px 8px", fontSize: "12px", color: "var(--mute)" }}>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 8px", fontWeight: "500", fontSize: "13px" }}>Conversion rate</td>
                    <td style={{ padding: "8px 8px" }}>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        disabled={user?.role !== "vendor" || settingsSaving}
                        value={modalConv}
                        onChange={e => setModalConv(e.target.value)}
                        style={{ width: "95px", padding: "6px 8px", fontSize: "13px" }}
                        required
                      />
                    </td>
                    <td style={{ padding: "8px 8px", color: "var(--mute)", fontSize: "12px" }}>
                      ₹ / box blank
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 8px", fontWeight: "500", fontSize: "13px" }}>Profit margin</td>
                    <td style={{ padding: "8px 8px" }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        disabled={user?.role !== "vendor" || settingsSaving}
                        value={modalMarg}
                        onChange={e => setModalMarg(e.target.value)}
                        style={{ width: "95px", padding: "6px 8px", fontSize: "13px" }}
                        required
                      />
                    </td>
                    <td style={{ padding: "8px 8px", color: "var(--mute)", fontSize: "12px" }}>
                      %
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 8px", fontWeight: "500", fontSize: "13px" }}>Tax (GST)</td>
                    <td style={{ padding: "8px 8px" }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        disabled={user?.role !== "vendor" || settingsSaving}
                        value={modalTax}
                        onChange={e => setModalTax(e.target.value)}
                        style={{ width: "95px", padding: "6px 8px", fontSize: "13px" }}
                        required
                      />
                    </td>
                    <td style={{ padding: "8px 8px", color: "var(--mute)", fontSize: "12px" }}>
                      %
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {settingsMsg && (
              <div style={{ background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "6px", padding: "8px 10px", fontSize: "12px", color: "#4ade80", marginBottom: "12px" }}>
                {settingsMsg}
              </div>
            )}
            {settingsErr && (
              <div className="err" style={{ marginBottom: "12px" }}>
                {settingsErr}
              </div>
            )}

            <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setQuotationModalOpen(false)}
                style={{ flex: "none" }}
              >
                {user?.role === "vendor" ? "Cancel" : "Close"}
              </button>
              {user?.role === "vendor" && (
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="btn pri"
                  style={{ flex: "none", padding: "6px 16px" }}
                >
                  {settingsSaving ? "Saving…" : "Save rates"}
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* Account Profile Modal */}
      {profileModalOpen && (
        <Modal onDismiss={() => setProfileModalOpen(false)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "16px", margin: 0, fontWeight: "700" }}>Account Profile</h3>
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--mute)", fontSize: "18px", cursor: "pointer", padding: "0 4px" }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
            <div className="kv"><span>Full Name</span><b>{user?.name || "Vendor User"}</b></div>
            <div className="kv"><span>Email</span><b>{user?.email || "—"}</b></div>
            <div className="kv"><span>Account Role</span><b style={{ textTransform: "capitalize" }}>{user?.role === "vendor" ? "Vendor (Owner)" : "Staff Member"}</b></div>
            {user?.company && (
              <div className="kv"><span>Company</span><b>{user.company}</b></div>
            )}
            <div className="kv"><span>Subscription Plan</span><b>Active</b></div>
            {user?.role === "vendor" && (
              <div className="kv"><span>Active Staff</span><b>{staffList.length} member(s)</b></div>
            )}
          </div>

          <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              className="btn pri"
              onClick={() => setProfileModalOpen(false)}
              style={{ flex: "none", padding: "6px 16px" }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Confirmed Order History Modal */}
      {orderHistoryOpen && (
        <Modal
          onDismiss={() => {
            setOrderHistoryOpen(false);
            setSelectedOrderDetails(null);
          }}
          style={{ width: "min(880px, 94vw)", maxWidth: "880px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
            <div>
              <h3 style={{ fontSize: "16px", margin: "0 0 4px 0", fontWeight: "700" }}>Confirmed Order History</h3>
              <p className="note" style={{ margin: 0, fontSize: "12px" }}>
                Records of confirmed orders saved with their respective box dimensions, plies, transport & discount.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOrderHistoryOpen(false);
                setSelectedOrderDetails(null);
              }}
              style={{ background: "transparent", border: "none", color: "var(--mute)", fontSize: "18px", cursor: "pointer", padding: "0 4px", lineHeight: 1 }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", minHeight: "220px", paddingRight: "4px" }}>
            {ordersLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 16px", gap: "14px" }}>
                <HourglassLoader size={44} />
                <span style={{ fontSize: "13px", color: "var(--mute)" }}>Fetching confirmed orders…</span>
              </div>
            ) : ordersErr ? (
              <div className="err" style={{ padding: "14px", background: "rgba(239, 68, 68, 0.08)", borderRadius: "8px" }}>
                {ordersErr}
              </div>
            ) : ordersList.length === 0 ? (
              <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--mute)" }}>
                <p style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "600", color: "var(--fg)" }}>No confirmed orders found</p>
                <p style={{ margin: 0, fontSize: "12.5px" }}>
                  Adjust dimensions, transport, and discount, then click <strong>"Confirm order"</strong> to save an order.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", fontSize: "12px", color: "var(--mute)" }}>
                  <span>Total confirmed orders: <strong style={{ color: "var(--fg)" }}>{ordersList.length}</strong></span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {ordersList.map((ord) => {
                    const isSelected = selectedOrderDetails?._id === ord._id;
                    const orderDate = ord.createdAt
                      ? new Date(ord.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—";

                    return (
                      <div key={ord._id || ord.orderNumber} className="order-history-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ fontSize: "14.5px", color: "var(--fg)" }}>{ord.orderNumber}</strong>
                            <span className="order-badge-confirmed">
                              <span style={{ fontSize: "9px" }}>●</span> Confirmed
                            </span>
                          </div>
                          <span style={{ fontSize: "12px", color: "var(--mute)" }}>{orderDate}</span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px 14px", fontSize: "12px", marginBottom: "10px" }}>
                          <div>
                            <span style={{ color: "var(--mute)", display: "block" }}>Box size</span>
                            <strong style={{ fontSize: "12.5px" }}>
                              {ord.box?.L} × {ord.box?.W} × {ord.box?.H} {ord.box?.unit || "mm"}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--mute)", display: "block" }}>Type & Board</span>
                            <span style={{ textTransform: "uppercase", fontWeight: "600" }}>{ord.box?.type || "RSC"}</span> · {ord.board?.ply || 5} ply
                          </div>
                          <div>
                            <span style={{ color: "var(--mute)", display: "block" }}>Quantity</span>
                            <strong>{fmt(ord.box?.Q)} pcs</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--mute)", display: "block" }}>Transport / Disc</span>
                            ₹{fmtMoney(ord.pricing?.trans ?? 0)} · {ord.pricing?.discount ?? 0}% off
                          </div>
                          <div>
                            <span style={{ color: "var(--mute)", display: "block" }}>Final Order Price</span>
                            <strong style={{ fontSize: "14px", color: "var(--fg)" }}>₹{fmtMoney(ord.finalOrderPrice)}</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--mute)", display: "block" }}>Confirmed by</span>
                            <span>{ord.createdByName || "Vendor"} ({ord.createdByType || "vendor"})</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid var(--line-soft)", paddingTop: "8px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetails(isSelected ? null : ord)}
                            className="btn"
                            style={{ padding: "4px 10px", fontSize: "11.5px" }}
                          >
                            {isSelected ? "Hide specs ▲" : "View specs ▼"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLoadOrderIntoCalculator(ord)}
                            className="btn pri"
                            style={{ padding: "4px 10px", fontSize: "11.5px" }}
                            title="Load this order's box dimensions & plies back into the calculator"
                          >
                            Load in Calculator ⤾
                          </button>
                        </div>

                        {isSelected && (
                          <div style={{ marginTop: "10px", padding: "10px 12px", background: "var(--soft)", borderRadius: "6px", fontSize: "12px", border: "1px solid var(--line-soft)" }}>
                            <div style={{ fontWeight: "600", marginBottom: "6px", color: "var(--fg)" }}>Order Specifications & Breakdown</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                              <div><strong>Paper cost / box:</strong> ₹{fmtMoney(ord.outputs?.quote?.paperCostPerBox ?? 0, 2)}</div>
                              <div><strong>Wastage:</strong> {ord.pricing?.extra ?? ord.board?.extra ?? 5}% (₹{fmtMoney(ord.outputs?.quote?.wastagePerBox ?? 0, 2)})</div>
                              <div><strong>Conversion / box:</strong> ₹{fmtMoney(ord.pricing?.conv ?? 2, 2)}</div>
                              <div><strong>Margin:</strong> {ord.pricing?.marg ?? 10}%</div>
                              <div><strong>Discount amount:</strong> ₹{fmtMoney(ord.outputs?.quote?.discountAmount ?? 0)} ({ord.pricing?.discount ?? 0}%)</div>
                              <div><strong>Transport:</strong> ₹{fmtMoney(ord.pricing?.trans ?? 0)}</div>
                              <div><strong>Tax (GST):</strong> {ord.pricing?.tax ?? 5}% (₹{fmtMoney(ord.outputs?.quote?.taxAmount ?? 0)})</div>
                              <div><strong>Sheet size:</strong> {ord.outputs?.sheet?.sizeText || `${ord.outputs?.sheet?.length} × ${ord.outputs?.sheet?.width} mm`}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
            <button
              type="button"
              className="btn pri"
              onClick={() => {
                setOrderHistoryOpen(false);
                setSelectedOrderDetails(null);
              }}
              style={{ padding: "6px 16px", fontSize: "12.5px" }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
