"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  clearAuthSession,
  inviteStaff,
  updateStaff,
  getStaffList,
  removeStaff,
  signup,
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
  getVendorCompany,
  updateVendorCompany,
} from "./auth-client";
import BoxPreview from "./BoxPreview";
import DieChart from "./DieChart";
import HourglassLoader from "./HourglassLoader";
import Select from "../components/Select";
import UnitSelect from "../components/UnitSelect";
import Sidebar from "../components/Sidebar";
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
  fld: { L: 450, W: 300, H: 80 },
};





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

/* --------------------------------------------------------------------------
   Staff Permissions Matrix & Presets
   -------------------------------------------------------------------------- */
const PERMISSION_MODULES = [
  { id: "order", label: "Box Orders", desc: "Calculations, orders, history" },
  { id: "reel", label: "Reel Stock", desc: "Warehouse inventory & reels" },
  { id: "flute", label: "Flute Profiles", desc: "Take-up factors & flute heights" },
  { id: "tolerance", label: "Score Tolerances", desc: "Deductions & allowances" },
  { id: "paper", label: "Paper Grades", desc: "Paper grades & GSM stock" },
  { id: "quotation", label: "Quotation Rates", desc: "Profit margins & conversion" },
  { id: "vendorCompany", label: "Company Info", desc: "Company profile & branding" },
  { id: "staff", label: "Manage Staff", desc: "Invite & manage staff" },
];

const PERMISSION_ACTIONS = [
  { id: "create", label: "Create" },
  { id: "read", label: "Read" },
  { id: "update", label: "Update" },
  { id: "delete", label: "Delete" },
];

const DEFAULT_STAFF_PERMISSIONS = {
  reel: { create: true, read: true, update: true, delete: false },
  flute: { create: true, read: true, update: true, delete: true },
  tolerance: { create: true, read: true, update: true, delete: true },
  paper: { create: true, read: true, update: true, delete: true },
  order: { create: true, read: true, update: true, delete: false },
  staff: { create: false, read: false, update: false, delete: false },
  quotation: { create: false, read: true, update: false, delete: false },
  vendorCompany: { create: false, read: true, update: false, delete: false },
};

const MANAGER_PERMISSIONS = {
  reel: { create: true, read: true, update: true, delete: true },
  flute: { create: true, read: true, update: true, delete: true },
  tolerance: { create: true, read: true, update: true, delete: true },
  paper: { create: true, read: true, update: true, delete: true },
  order: { create: true, read: true, update: true, delete: true },
  staff: { create: true, read: true, update: true, delete: true },
  quotation: { create: true, read: true, update: true, delete: true },
  vendorCompany: { create: true, read: true, update: true, delete: true },
};

const READONLY_PERMISSIONS = {
  reel: { create: false, read: true, update: false, delete: false },
  flute: { create: false, read: true, update: false, delete: false },
  tolerance: { create: false, read: true, update: false, delete: false },
  paper: { create: false, read: true, update: false, delete: false },
  order: { create: false, read: true, update: false, delete: false },
  staff: { create: false, read: false, update: false, delete: false },
  quotation: { create: false, read: true, update: false, delete: false },
  vendorCompany: { create: false, read: true, update: false, delete: false },
};

function PermissionsMatrix({ permissions, onChange, disabled = false }) {
  const currentPerms = permissions || DEFAULT_STAFF_PERMISSIONS;

  const toggleAction = (moduleId, actionId) => {
    if (disabled) return;
    const currentModule = currentPerms[moduleId] || {};
    const updated = {
      ...currentPerms,
      [moduleId]: {
        ...currentModule,
        [actionId]: !currentModule[actionId],
      },
    };
    onChange(updated);
  };

  const toggleAllForModule = (moduleId) => {
    if (disabled) return;
    const currentModule = currentPerms[moduleId] || {};
    const allActive = PERMISSION_ACTIONS.every(a => currentModule[a.id]);
    const nextVal = !allActive;
    const updated = {
      ...currentPerms,
      [moduleId]: {
        create: nextVal,
        read: nextVal,
        update: nextVal,
        delete: nextVal,
      },
    };
    onChange(updated);
  };

  const applyPreset = (presetPerms) => {
    if (disabled) return;
    onChange(JSON.parse(JSON.stringify(presetPerms)));
  };

  return (
    <div style={{
      border: "2px solid #000000",
      borderRadius: "8px",
      background: "#ffffff",
      padding: "10px 12px",
      boxShadow: "2px 2px 0px #000000",
      marginTop: "8px",
      marginBottom: "8px",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "6px",
        marginBottom: "10px",
        paddingBottom: "8px",
        borderBottom: "1.5px solid #000000",
      }}>
        <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Permission Presets:
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset(DEFAULT_STAFF_PERMISSIONS)}
            style={{ padding: "3px 8px", fontSize: "11px", fontWeight: "700" }}
            title="Standard operator access"
          >
            Operator
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset(MANAGER_PERMISSIONS)}
            style={{ padding: "3px 8px", fontSize: "11px", fontWeight: "700" }}
            title="Full administrative access"
          >
            Manager
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset(READONLY_PERMISSIONS)}
            style={{ padding: "3px 8px", fontSize: "11px", fontWeight: "700" }}
            title="Read-only access"
          >
            Read Only
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto", maxHeight: "230px", overflowY: "auto" }}>
        <table style={{
          width: "100%",
          minWidth: "360px",
          border: "none",
          boxShadow: "none",
          margin: 0,
          background: "transparent",
        }}>
          <thead>
            <tr style={{ background: "#000000", color: "#ffffff", position: "sticky", top: 0, zIndex: 1 }}>
              <th style={{ padding: "5px 8px", fontSize: "11px", fontWeight: "800", textAlign: "left" }}>Module</th>
              {PERMISSION_ACTIONS.map(action => (
                <th key={action.id} style={{ padding: "5px 4px", fontSize: "10.5px", fontWeight: "800", textAlign: "center", width: "46px" }}>
                  {action.label}
                </th>
              ))}
              <th style={{ padding: "5px 4px", fontSize: "10.5px", fontWeight: "800", textAlign: "center", width: "38px" }}>All</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MODULES.map(mod => {
              const modPerms = currentPerms[mod.id] || {};
              const isAllChecked = PERMISSION_ACTIONS.every(a => modPerms[a.id]);
              return (
                <tr key={mod.id} style={{ borderBottom: "1px solid #e4e4e7" }}>
                  <td style={{ padding: "4px 8px", fontSize: "12px", fontWeight: "700" }} title={mod.desc}>
                    {mod.label}
                  </td>
                  {PERMISSION_ACTIONS.map(action => (
                    <td key={action.id} style={{ padding: "3px 4px", textAlign: "center", verticalAlign: "middle" }}>
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={Boolean(modPerms[action.id])}
                        onChange={() => toggleAction(mod.id, action.id)}
                        style={{
                          width: "15px",
                          height: "15px",
                          cursor: disabled ? "not-allowed" : "pointer",
                          accentColor: "#000000",
                          margin: 0,
                        }}
                        aria-label={`${mod.label} ${action.label}`}
                      />
                    </td>
                  ))}
                  <td style={{ padding: "3px 4px", textAlign: "center", verticalAlign: "middle" }}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleAllForModule(mod.id)}
                      style={{
                        padding: "2px 5px",
                        fontSize: "9px",
                        fontWeight: "700",
                        background: isAllChecked ? "#000000" : "#ffffff",
                        color: isAllChecked ? "#ffffff" : "#000000",
                        border: "1.5px solid #000000",
                        borderRadius: "4px",
                        boxShadow: "none",
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                      title={`Toggle all ${mod.label} permissions`}
                    >
                      {isAllChecked ? "✓" : "—"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
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

  /* Profile Modal State */
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  /* Company Settings Modal State (Vendor) */
  const [companySettingsModalOpen, setCompanySettingsModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    address: "",
    email: "",
    contact: "",
  });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyMsg, setCompanyMsg] = useState("");
  const [companyErr, setCompanyErr] = useState("");

  const handleOpenCompanySettings = async () => {
    setCompanyMsg("");
    setCompanyErr("");
    setCompanySettingsModalOpen(true);
    setCompanyLoading(true);
    try {
      const data = await getVendorCompany();
      if (data) {
        setCompanyForm({
          name: data.name || user?.company || "",
          address: data.address || "",
          email: data.email || user?.email || "",
          contact: data.contact || "",
        });
      } else {
        setCompanyForm({
          name: user?.company || "",
          address: "",
          email: user?.email || "",
          contact: "",
        });
      }
    } catch (err) {
      setCompanyErr(err.message || "Failed to load company details");
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleSaveCompanySettings = async (e) => {
    if (e) e.preventDefault();
    if (!companyForm.name || !companyForm.name.trim()) {
      setCompanyErr("Company name is required.");
      return;
    }
    setCompanySaving(true);
    setCompanyMsg("");
    setCompanyErr("");
    try {
      const updated = await updateVendorCompany({
        name: companyForm.name.trim(),
        address: companyForm.address.trim(),
        email: companyForm.email.trim(),
        contact: companyForm.contact.trim(),
      });
      if (updated) {
        setCompanyForm({
          name: updated.name || "",
          address: updated.address || "",
          email: updated.email || "",
          contact: updated.contact || "",
        });
        if (user) {
          setUser(prev => ({ ...prev, company: updated.name }));
        }
      }
      setCompanyMsg("Company details saved successfully!");
      setTimeout(() => {
        setCompanyMsg("");
      }, 3500);
    } catch (err) {
      setCompanyErr(err.message || "Failed to save company details");
    } finally {
      setCompanySaving(false);
    }
  };

  const scrollToQuotation = () => {
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
    openStaffModal();
  };

  const handleOpenProfile = async () => {
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

  const handleOpenQuotationSettings = () => {
    setModalConv(quote.conv);
    setModalMarg(quote.marg);
    setModalTax(quote.tax);
    setSettingsMsg("");
    setSettingsErr("");
    setQuotationModalOpen(true);
  };

  const handleSidebarNavigate = (itemId) => {
    if (itemId === "calc") {
      const el = document.getElementById("calc");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (itemId === "quotation") {
      scrollToQuotation();
    } else if (itemId === "inventory") {
      setTab("inv");
      const el = document.getElementById("specs-card");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (itemId === "flutes") {
      setTab("flute");
      const el = document.getElementById("specs-card");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (itemId === "tolerances") {
      setTab("tol");
      const el = document.getElementById("specs-card");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (itemId === "paper") {
      setTab("paper");
      const el = document.getElementById("specs-card");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  /* Staff Management State */
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffView, setStaffView] = useState("list"); // "list" | "invite" | "edit"
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const [invitePermissions, setInvitePermissions] = useState(DEFAULT_STAFF_PERMISSIONS);

  /* Edit Staff State */
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [editingStaffMember, setEditingStaffMember] = useState(null);
  const [editStaffName, setEditStaffName] = useState("");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffPermissions, setEditStaffPermissions] = useState(DEFAULT_STAFF_PERMISSIONS);
  const [editStaffBusy, setEditStaffBusy] = useState(false);
  const [editStaffMsg, setEditStaffMsg] = useState("");
  const [editStaffErr, setEditStaffErr] = useState("");

  /* Delete Staff State */
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [deleteReturnView, setDeleteReturnView] = useState("list"); // "list" | "edit"
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  const openStaffModal = async () => {
    setStaffModalOpen(true);
    setStaffView("list");
    setStaffToDelete(null);
    setDeleteErr("");
    setEditingStaffId(null);
    setEditingStaffMember(null);
    setInviteMsg("");
    setInviteErr("");
    setEditStaffMsg("");
    setEditStaffErr("");
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
      await inviteStaff({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        permissions: invitePermissions,
      });
      setInviteMsg(`Invite sent to ${inviteEmail}! Temporary password is their email.`);
      const updated = await getStaffList();
      setStaffList(updated);
      setTimeout(() => {
        setStaffView("list");
        setInviteName("");
        setInviteEmail("");
        setInvitePermissions(DEFAULT_STAFF_PERMISSIONS);
        setInviteMsg("");
      }, 1200);
    } catch (err) {
      setInviteErr(err.message || "Failed to invite staff");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleStartEditStaff = (member) => {
    setEditingStaffId(member._id);
    setEditingStaffMember(member);
    setEditStaffName(member.name || "");
    setEditStaffEmail(member.email || "");
    const memberPerms = {
      reel: { ...DEFAULT_STAFF_PERMISSIONS.reel, ...(member.permissions?.reel || {}) },
      flute: { ...DEFAULT_STAFF_PERMISSIONS.flute, ...(member.permissions?.flute || {}) },
      tolerance: { ...DEFAULT_STAFF_PERMISSIONS.tolerance, ...(member.permissions?.tolerance || {}) },
      paper: { ...DEFAULT_STAFF_PERMISSIONS.paper, ...(member.permissions?.paper || {}) },
      order: { ...DEFAULT_STAFF_PERMISSIONS.order, ...(member.permissions?.order || {}) },
      staff: { ...DEFAULT_STAFF_PERMISSIONS.staff, ...(member.permissions?.staff || {}) },
      quotation: { ...DEFAULT_STAFF_PERMISSIONS.quotation, ...(member.permissions?.quotation || {}) },
      vendorCompany: { ...DEFAULT_STAFF_PERMISSIONS.vendorCompany, ...(member.permissions?.vendorCompany || {}) },
    };
    setEditStaffPermissions(memberPerms);
    setEditStaffMsg("");
    setEditStaffErr("");
    setStaffView("edit");
  };

  const handleCancelEditStaff = () => {
    setStaffView("list");
    setEditingStaffId(null);
    setEditingStaffMember(null);
    setEditStaffMsg("");
    setEditStaffErr("");
  };

  const handleSaveEditStaff = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setEditStaffMsg("");
    setEditStaffErr("");
    if (!editStaffEmail.trim()) {
      setEditStaffErr("Staff email is required");
      return;
    }
    if (!editStaffName.trim()) {
      setEditStaffErr("Staff name is required");
      return;
    }
    setEditStaffBusy(true);
    try {
      await updateStaff(editingStaffId, {
        name: editStaffName.trim(),
        email: editStaffEmail.trim(),
        permissions: editStaffPermissions,
      });
      setEditStaffMsg("Staff updated successfully!");
      const updated = await getStaffList();
      setStaffList(updated);
      setTimeout(() => {
        setStaffView("list");
        setEditingStaffId(null);
        setEditingStaffMember(null);
        setEditStaffMsg("");
      }, 1000);
    } catch (err) {
      setEditStaffErr(err.message || "Failed to update staff member");
    } finally {
      setEditStaffBusy(false);
    }
  };

  const promptDeleteStaff = (member, returnView = "list") => {
    setStaffToDelete(member);
    setDeleteReturnView(returnView);
    setDeleteErr("");
    setStaffView("delete");
  };

  const handleCancelDeleteStaff = () => {
    setStaffView(deleteReturnView || "list");
    setStaffToDelete(null);
    setDeleteErr("");
  };

  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete?._id) return;
    setDeleteBusy(true);
    setDeleteErr("");
    try {
      await removeStaff(staffToDelete._id);
      setStaffList(prev => prev.filter(s => s._id !== staffToDelete._id));
      if (editingStaffId === staffToDelete._id) {
        setEditingStaffId(null);
        setEditingStaffMember(null);
      }
      setStaffToDelete(null);
      setStaffView("list");
    } catch (err) {
      setDeleteErr(err.message || "Failed to remove staff member");
    } finally {
      setDeleteBusy(false);
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
  const [tab, setTab] = useState("inv");
  const [tolAll, setTolAll] = useState(() => TOL[5] || 12);
  const [dialog, setDialog] = useState(null); // {kind:'flute'|'reel'|'paper', edit}
  const [dialogErr, setDialogErr] = useState("");
  const [fluteForm, setFluteForm] = useState({ n: "", f: "", th: "", d: "" });
  const [reelForm, setReelForm] = useState({ w: "", g: "", b: "", p: "", s: "", pg: "" });
  const [paperForm, setPaperForm] = useState({ n: "", g: "", b: "", p: "", fl: "B", tu: "1.32" });
  const [fluteRows, setFluteRows] = useState([]);
  const [paperRows, setPaperRows] = useState([]);
  const [reels, setReels] = useState([]);
  const [tolRows, setTolRows] = useState(() => ({ ...TOL }));
  const [savedTolRows, setSavedTolRows] = useState(() => ({ ...TOL }));
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
    const nextTol = tolRows[n] ?? tolRows[String(n)] ?? TOL[n] ?? 12;
    setTolAll(Number(nextTol));
  };
  const setCell = (i, k) => e =>
    setPlies(old => old.map((p, j) => (j === i ? { ...p, [k]: e.target.value } : p)));

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
        const isFlute = role(i) === "flute";
        return {
          ...p,
          paperName: paper.name,
          gsm: String(paper.gsm),
          bf: String(paper.bf),
          price: paper.price !== undefined && paper.price !== null && paper.price !== "" ? String(paper.price) : p.price,
          flute: isFlute ? (paper.flute || p.flute || "B") : p.flute,
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

  const openPaper = (k = null, plyIndex = null) => {
    const x = k == null ? { name: "", gsm: "", bf: "", price: "", flute: "B", takeUp: 1.32 } : paperRows.find(p => String(p._id) === String(k));
    const targetPly = (plyIndex != null && plies[plyIndex]) ? plies[plyIndex] : null;
    const initialN = x ? x.name : "";
    const initialG = x ? x.gsm : (targetPly?.gsm || "");
    const initialB = x ? x.bf : (targetPly?.bf || "");
    const initialP = x ? (x.price ?? "") : (targetPly?.price || "");
    const initialFl = x ? (x.flute || "B") : (targetPly?.flute || "B");
    const initialTu = x ? (x.takeUp ?? "1.32") : "1.32";
    setPaperForm({ n: initialN, g: initialG, b: initialB, p: initialP, fl: initialFl, tu: String(initialTu) });
    setDialogErr("");
    setDialog({ kind: "paper", edit: k, plyIndex });
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
      price: paperForm.p !== "" && !isNaN(Number(paperForm.p)) ? +paperForm.p : 0,
      flute: paperForm.fl || "B",
      takeUp: paperForm.tu !== "" && !isNaN(Number(paperForm.tu)) ? +paperForm.tu : 1.32,
    };
    if (!payload.name) return setDialogErr("Name is required");
    try {
      if (dialog.edit != null) {
        const updated = await updatePaperGrade(dialog.edit, payload);
        setPaperRows(old => old.map(p => String(p._id) === String(dialog.edit) ? updated : p));
      } else {
        const created = await createPaperGrade(payload);
        setPaperRows(old => [...old, created]);
        if (dialog?.plyIndex !== null && dialog?.plyIndex !== undefined) {
          const targetIdx = dialog.plyIndex;
          const isFlute = role(targetIdx) === "flute";
          setPlies(old => old.map((p, j) => {
            if (j !== targetIdx) return p;
            return {
              ...p,
              paperName: created.name,
              gsm: created.gsm ? String(created.gsm) : p.gsm,
              bf: created.bf ? String(created.bf) : p.bf,
              price: created.price !== undefined && created.price !== null ? String(created.price) : p.price,
              flute: isFlute ? (created.flute || p.flute || "B") : p.flute,
            };
          }));
        }
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
        if (tolRes.status === "fulfilled" && tolRes.value && typeof tolRes.value === "object" && Object.keys(tolRes.value).length > 0) {
          liveTols = tolRes.value;
          setTolRows(liveTols);
          setSavedTolRows(liveTols);
          const currentPlyTol = liveTols[ply] ?? liveTols[String(ply)] ?? TOL[ply] ?? 12;
          setTolAll(Number(currentPlyTol));
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
      <div className="app-shell">
        <Sidebar user={null} activeItem="calc" />
        <div className="app-main">
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
      </div>
    );
  }

  const activeSidebarItem = tab === "inv" ? "inventory" : tab === "flute" ? "flutes" : tab === "tol" ? "tolerances" : tab === "paper" ? "paper" : "calc";

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        activeItem={activeSidebarItem}
        onNavigate={handleSidebarNavigate}
        onOpenOrderHistory={openOrderHistory}
        onOpenQuotation={handleOpenQuotationSettings}
        onManageStaff={openStaffModal}
        onInviteStaff={openStaffModal}
        onOpenProfile={handleOpenProfile}
        onOpenCompanySettings={handleOpenCompanySettings}
        onLogout={handleLogout}
      />
      <div className="app-main">
        <section className="hero" id="calc">
          <div className="left">
            <h1>Calculator</h1>
            <p className="sub">Inside dimensions. Switch between mm and inch — values convert automatically.</p>
            <div className="og">
              <label className="full">Box type
                <Select
                  id="select-order-type"
                  name="type"
                  value={order.type}
                  onChange={e => {
                    const newType = e.target.value;
                    const def = BOX_TYPE_DEFAULTS[newType] || BOX_TYPE_DEFAULTS.rsc;
                    setOrder(o => ({ ...o, type: newType, L: def.L, W: def.W, H: def.H }));
                  }}
                >
                  {BOX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </label>
              {DIM_FIELDS.map(([k, label, minMM]) => (
                <label key={k}>{label}
                  <div className="unit has-select">
                    <input
                      id={`input-order-${k}`}
                      name={k}
                      type="number"
                      inputMode="decimal"
                      min={toDisp(minMM, unit)}
                      step={unit === "mm" ? "1" : "0.01"}
                      value={toDisp(order[k], unit)}
                      onChange={setDim(k)}
                    />
                    <UnitSelect unit={unit} onChange={changeUnit} label={`${label} unit`} />
                  </div>
                </label>
              ))}
              <label>Quantity<div className="unit"><input id="input-order-Q" name="Q" type="number" min="1" step="1" value={order.Q} onChange={set(order, setOrder)} /><span className="unit-tag">pcs</span></div></label>
              <label>Number of ply
                <Select id="select-order-ply" value={ply} onChange={e => setPlyCount(+e.target.value)}>
                  <option value="3">3 ply</option>
                  <option value="5">5 ply</option>
                  <option value="7">7 ply</option>
                  <option value="9">9 ply</option>
                </Select>
              </label>
              <label>Joint allowance<div className="unit has-select"><input id="input-order-J" name="J" type="number" min="0" step={unit === "mm" ? "1" : "0.01"} value={toDisp(order.J, unit)} onChange={setDim("J")} /><UnitSelect unit={unit} onChange={changeUnit} label="Joint allowance unit" /></div></label>
            </div>
          </div>
          <BoxPreview type={order.type} L={order.L} W={order.W} H={order.H} J={order.J} unit={unit} />
        </section>

        <main>
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
                        <Select
                          value={p.paperName || ""}
                          onChange={e => {
                            if (e.target.value === "__new_paper__") {
                              openPaper(null, i);
                              return;
                            }
                            setPaper(i)(e);
                          }}
                          style={{ width: 140 }}
                        >
                          <option value="__new_paper__">+ New paper grade</option>
                          <option value="">— pick a grade —</option>
                          {paperRows.map(pr => (
                            <option key={pr.name} value={pr.name}>{pr.name}</option>
                          ))}
                        </Select>
                      </td>
                      <td><input id={`ply-gsm-${i}`} type="number" min="60" step="1" value={p.gsm} style={{ width: 76 }} onChange={setCell(i, "gsm")} /></td>
                      <td><input id={`ply-bf-${i}`} type="number" min="10" step="1" value={p.bf} style={{ width: 64 }} onChange={setCell(i, "bf")} /></td>
                      <td>{role(i) === "flute"
                        ? (
                          <Select
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
                          </Select>
                        )
                        : <span className="note">1.00 (liner)</span>}</td>
                      <td>
                        <Select
                          value={p.reelId || ""}
                          style={{ minWidth: 260 }}
                          onChange={setReel(i)}
                        >
                          {reelOpts}
                        </Select>
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
              <label style={{ maxWidth: 220 }}>Score tolerance (whole board)<div className="unit has-select"><input id="input-score-tol" type="number" min="0" step={unit === "mm" ? "1" : "0.01"} value={toDisp(tolAll, unit)} onChange={e => setTolAll(toMM(e.target.value, unit) || 0)} /><UnitSelect unit={unit} onChange={changeUnit} label="Score tolerance unit" /></div></label>
              <label style={{ maxWidth: 220 }}>Overall Wastage<div className="unit"><input id="input-overall-wastage" name="extra" type="number" min="0" max="100" step="1" value={quote.extra} onChange={set(quote, setQuote)} /><span className="unit-tag">%</span></div></label>
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

          <div className="card" id="specs-card" style={{ marginTop: 16 }}>
            <div className="tabs" role="tablist">
              {[["inv", "Reel inventory"], ["flute", "Flute table"], ["tol", "Score tolerance"], ["paper", "Paper"]].map(([k, label]) => (
                <button key={k} className="tab" role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
              ))}
            </div>

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
                          <td><input type="number" min={toDisp(100, unit)} step={unit === "mm" ? "1" : "0.01"} style={{ width: 100 }} aria-label={`Reel width in ${unitLabel(unit)}`} value={toDisp(r.w, unit)} onChange={setReelW(r.id || r._id)} onBlur={e => handleReelWBlur(r.id || r._id, toMM(e.target.value, unit))()} /></td><td style={{ color: "var(--mute)" }}>{r.paperGrade || "—"}</td><td>{r.gsm}</td><td>{r.bf}</td><td>₹{r.price}</td><td>{fmt(r.stock)}</td>
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
                                  step={unit === "mm" ? "1" : "0.01"}
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
                  <p className="note" style={{ flex: 1, margin: 0 }}>Default paper grades used to auto-fill GSM, BF, and price per kg.</p>
                  <button type="button" style={{ flex: "none" }} onClick={askConfirm("paper-reset", async () => {
                    const res = await resetPaperGradesApi();
                    setPaperRows(res || []);
                    setPaperSel(new Set());
                  })}>Reset to default</button>
                  <button type="button" className={paperSel.size ? "danger" : ""} style={{ flex: "none" }} disabled={!paperSel.size} onClick={askConfirm("paper-del-bulk", delSelPapers, paperSel.size)}>{`Delete selected (${paperSel.size})`}</button>
                  <button type="button" className="pri" style={{ flex: "none" }} onClick={() => openPaper()}>+ Add paper grade</button>
                </div>
                <div className="scroll"><table style={{ minWidth: 520 }}>
                  <thead><tr><th style={{ width: 32 }}><input type="checkbox" aria-label="Select all paper grades" checked={paperRows.length > 0 && paperSel.size === paperRows.length} onChange={e => setPaperSel(new Set(e.target.checked ? paperRows.map(p => String(p._id)) : []))} /></th><th>Paper Type</th><th>GSM</th><th>BF</th><th>Price per kg (₹)</th><th>Default Flute</th><th></th></tr></thead>
                  <tbody>
                    {paperRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "28px 16px", color: "var(--mute)", fontSize: 13 }}>
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
                          <td>{p.price !== undefined && p.price !== null ? `₹${p.price}` : "—"}</td>
                          <td>{p.flute || "B"} (factor {Number(p.takeUp ?? 1.32).toFixed(2)})</td>
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
              <label>Thickness range (optional)<div className="unit has-select"><input name="th" placeholder={unit === "inch" ? "e.g. 0.10–0.12" : (unit === "cm" ? "e.g. 0.25–0.30" : "e.g. 2.5–3.0")} value={rangeDisp(fluteForm.th, unit)} onChange={e => setFluteForm(f => ({ ...f, th: rangeMM(e.target.value, unit) }))} /><UnitSelect unit={unit} onChange={changeUnit} label="Flute thickness unit" /></div></label>
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
              <label className="full">Reel width<div className="unit has-select"><input name="w" type="number" min={toDisp(100, unit)} step={unit === "mm" ? "1" : "0.01"} placeholder={unit === "inch" ? "e.g. 59.06" : (unit === "cm" ? "e.g. 150" : "e.g. 1500")} value={toDisp(reelForm.w, unit)} onChange={e => setReelForm(f => ({ ...f, w: toMM(e.target.value, unit) }))} /><UnitSelect unit={unit} onChange={changeUnit} label="Reel width unit" /></div></label>
              <label className="full">Paper Grade (optional)
                <Select name="pg" value={reelForm.pg} onChange={setReelPaper}>
                  <option value="">— pick a grade —</option>
                  {paperRows.map(p => <option key={p._id} value={p.name}>{p.name}</option>)}
                </Select>
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
              <label className="full">Price per kg (₹)<input name="p" type="number" min="0" step="0.5" placeholder="e.g. 38" value={paperForm.p} onChange={set(paperForm, setPaperForm)} /></label>
              <label className="full">
                Default Flute (for flute layers)
                <Select
                  name="fl"
                  value={paperForm.fl || "B"}
                  onChange={e => {
                    const selFlute = fluteRows.find(f => f.n === e.target.value);
                    setPaperForm(f => ({
                      ...f,
                      fl: e.target.value,
                      tu: selFlute?.f ? String(selFlute.f) : (f.tu || "1.32"),
                    }));
                  }}
                >
                  {fluteRows.map(f => (
                    <option key={f.n} value={f.n}>{f.n} · {Number(f.f).toFixed(2)} take-up</option>
                  ))}
                </Select>
              </label>
            </div>
            <p className="note" style={{ margin: "6px 0 0 0", fontSize: 11 }}>
              When chosen on a <b>flute layer</b>, this flute profile will be auto-filled. <b>Liner layers</b> always use 1.00.
            </p>
            {dialogErr && <div className="err" style={{ marginTop: 12, marginBottom: 0 }}>{dialogErr}</div>}
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" style={{ flex: "none" }} onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" className="pri" style={{ flex: "none" }} onClick={savePaper}>{dialog.edit != null ? "Save" : "Add"}</button>
            </div>
          </Modal>
        )}

        {staffModalOpen && (
          <Modal onDismiss={() => setStaffModalOpen(false)} style={{ width: "min(500px, 92vw)", maxHeight: "90vh", overflowY: "auto" }}>
            {/* =========================================================================
              VIEW 1: STAFF LIST (DEFAULT)
              ========================================================================= */}
            {staffView === "list" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", margin: 0, fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Manage Staff ({staffList.length})
                    </h3>
                    <p className="note" style={{ margin: "3px 0 0 0", fontSize: "12px" }}>
                      Select a staff member to view and manage their details and permissions.
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn pri"
                      onClick={() => {
                        setStaffView("invite");
                        setInviteName("");
                        setInviteEmail("");
                        setInvitePermissions(DEFAULT_STAFF_PERMISSIONS);
                        setInviteMsg("");
                        setInviteErr("");
                      }}
                      style={{ padding: "6px 14px", fontSize: "12px", whiteSpace: "nowrap" }}
                    >
                      + Add Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffModalOpen(false)}
                      style={{ background: "transparent", border: "none", color: "var(--mute)", fontSize: "18px", cursor: "pointer", padding: "0 4px" }}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {staffLoading ? (
                  <div style={{ padding: "32px 0", textAlign: "center", color: "var(--mute)", fontStyle: "italic" }}>
                    Loading staff list…
                  </div>
                ) : staffList.length === 0 ? (
                  <div style={{
                    border: "2px dashed #000000",
                    borderRadius: "8px",
                    padding: "32px 16px",
                    textAlign: "center",
                    background: "var(--soft)",
                    marginTop: "12px",
                  }}>
                    <div style={{ fontSize: "28px", marginBottom: "8px" }}>👥</div>
                    <div style={{ fontWeight: "800", fontSize: "14px", marginBottom: "4px" }}>
                      No Staff Members Added Yet
                    </div>
                    <div style={{ color: "var(--mute)", fontSize: "12px", maxWidth: "340px", margin: "0 auto 16px" }}>
                      Invite your team members to collaborate on orders, inventory, and calculations with tailored access controls.
                    </div>
                    <button
                      type="button"
                      className="btn pri"
                      onClick={() => {
                        setStaffView("invite");
                        setInviteName("");
                        setInviteEmail("");
                        setInvitePermissions(DEFAULT_STAFF_PERMISSIONS);
                        setInviteMsg("");
                        setInviteErr("");
                      }}
                      style={{ padding: "8px 18px", fontSize: "12.5px" }}
                    >
                      + Add First Staff Member
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "380px", overflowY: "auto", paddingRight: "2px" }}>
                    {staffList.map(member => (
                      <div
                        key={member._id}
                        onClick={() => handleStartEditStaff(member)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "var(--surface)",
                          border: "2px solid #000000",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          boxShadow: "2px 2px 0px #000000",
                          cursor: "pointer",
                          transition: "transform 0.1s ease, box-shadow 0.1s ease",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = "translate(-1px, -1px)";
                          e.currentTarget.style.boxShadow = "3px 3px 0px #000000";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.boxShadow = "2px 2px 0px #000000";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "6px",
                            background: "#000000",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "800",
                            fontSize: "13.5px",
                            fontFamily: "var(--font-heading)",
                            flexShrink: 0,
                          }}>
                            {(member.name || member.email || "S").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", fontSize: "13.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>{member.name || member.email.split("@")[0]}</span>
                              <span style={{
                                background: member.status === "active" ? "#dcfce7" : "var(--soft)",
                                color: member.status === "active" ? "#166534" : "var(--mute)",
                                border: "1px solid #000000",
                                fontSize: "10px",
                                padding: "0 6px",
                                borderRadius: "9999px",
                                fontWeight: "700",
                                textTransform: "capitalize",
                              }}>
                                {member.status || "active"}
                              </span>
                            </div>
                            <div style={{ color: "var(--mute)", fontSize: "11.5px", marginTop: "2px" }}>
                              {member.email}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleStartEditStaff(member)}
                            className="btn"
                            style={{ padding: "5px 12px", fontSize: "11.5px", fontWeight: "700" }}
                          >
                            Manage →
                          </button>
                          <button
                            type="button"
                            onClick={() => promptDeleteStaff(member, "list")}
                            className="btn"
                            style={{ padding: "5px 10px", fontSize: "11.5px", color: "#dc2626", borderColor: "#000000", fontWeight: "700" }}
                            title="Remove staff member"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
              VIEW 2: DEDICATED SCREEN TO INVITE NEW STAFF
              ========================================================================= */}
            {staffView === "invite" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "2px solid #000000", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setStaffView("list");
                        setInviteMsg("");
                        setInviteErr("");
                      }}
                      className="btn"
                      style={{ padding: "4px 10px", fontSize: "12px", fontWeight: "700" }}
                    >
                      ← Back
                    </button>
                    <h3 style={{ fontSize: "15px", margin: 0, fontWeight: "800", textTransform: "uppercase" }}>
                      Invite New Staff Member
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStaffModalOpen(false)}
                    style={{ background: "transparent", border: "none", color: "var(--mute)", fontSize: "18px", cursor: "pointer", padding: "0 4px" }}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleInviteStaff} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div className="row" style={{ alignItems: "flex-end", gap: "10px" }}>
                    <label style={{ flex: 1, minWidth: "140px" }}>
                      Staff Name
                      <input
                        type="text"
                        placeholder="e.g. Alex Smith"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        disabled={inviteBusy}
                      />
                    </label>
                    <label style={{ flex: 1.2, minWidth: "180px" }}>
                      Staff Email
                      <input
                        type="email"
                        required
                        placeholder="staff@example.com"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        disabled={inviteBusy}
                      />
                    </label>
                  </div>

                  <p className="note" style={{ margin: "0", fontSize: "11.5px" }}>
                    Invited staff can log in at <b>/auth</b> using their email as username and temporary password.
                  </p>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase", margin: 0 }}>
                        Access Permissions
                      </label>
                    </div>
                    <PermissionsMatrix
                      permissions={invitePermissions}
                      onChange={setInvitePermissions}
                      disabled={inviteBusy}
                    />
                  </div>

                  {inviteMsg && (
                    <div style={{ background: "rgba(34, 197, 94, 0.12)", border: "1.5px solid #16a34a", borderRadius: "6px", padding: "8px 12px", fontSize: "12px", color: "#166534", fontWeight: "700" }}>
                      {inviteMsg}
                    </div>
                  )}
                  {inviteErr && (
                    <div className="err" style={{ margin: 0 }}>
                      {inviteErr}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setStaffView("list");
                        setInviteMsg("");
                        setInviteErr("");
                      }}
                      disabled={inviteBusy}
                      style={{ padding: "7px 16px", fontSize: "12px" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteBusy}
                      className="btn pri"
                      style={{ padding: "7px 20px", fontSize: "12px" }}
                    >
                      {inviteBusy ? "Inviting…" : "Send Invite"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* =========================================================================
              VIEW 3: DEDICATED SCREEN TO EDIT AN EXISTING STAFF MEMBER
              ========================================================================= */}
            {staffView === "edit" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "2px solid #000000", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setStaffView("list");
                        setEditStaffMsg("");
                        setEditStaffErr("");
                      }}
                      className="btn"
                      style={{ padding: "4px 10px", fontSize: "12px", fontWeight: "700" }}
                    >
                      ← Back
                    </button>
                    <h3 style={{ fontSize: "15px", margin: 0, fontWeight: "800", textTransform: "uppercase" }}>
                      Manage: {editingStaffMember?.name || editStaffName || editingStaffMember?.email || "Staff Member"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStaffModalOpen(false)}
                    style={{ background: "transparent", border: "none", color: "var(--mute)", fontSize: "18px", cursor: "pointer", padding: "0 4px" }}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveEditStaff} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div className="row" style={{ alignItems: "flex-end", gap: "10px" }}>
                    <label style={{ flex: 1, minWidth: "140px" }}>
                      Staff Name
                      <input
                        type="text"
                        required
                        value={editStaffName}
                        onChange={e => setEditStaffName(e.target.value)}
                        placeholder="Staff Name"
                        disabled={editStaffBusy}
                      />
                    </label>
                    <label style={{ flex: 1.2, minWidth: "180px" }}>
                      Staff Email (Login Username)
                      <input
                        type="email"
                        required
                        value={editStaffEmail}
                        onChange={e => setEditStaffEmail(e.target.value)}
                        placeholder="staff@example.com"
                        disabled={editStaffBusy}
                      />
                    </label>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase", margin: 0 }}>
                        Access Permissions
                      </label>
                    </div>
                    <PermissionsMatrix
                      permissions={editStaffPermissions}
                      onChange={setEditStaffPermissions}
                      disabled={editStaffBusy}
                    />
                  </div>

                  {editStaffMsg && (
                    <div style={{ background: "rgba(34, 197, 94, 0.12)", border: "1.5px solid #16a34a", borderRadius: "6px", padding: "8px 12px", fontSize: "12px", color: "#166534", fontWeight: "700" }}>
                      {editStaffMsg}
                    </div>
                  )}
                  {editStaffErr && (
                    <div className="err" style={{ margin: 0 }}>
                      {editStaffErr}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={() => promptDeleteStaff({ _id: editingStaffId, name: editStaffName, email: editStaffEmail }, "edit")}
                      disabled={editStaffBusy}
                      style={{ padding: "7px 14px", fontSize: "12px", color: "#dc2626", borderColor: "#000000" }}
                    >
                      Remove Staff
                    </button>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setStaffView("list");
                          setEditStaffMsg("");
                          setEditStaffErr("");
                        }}
                        disabled={editStaffBusy}
                        style={{ padding: "7px 16px", fontSize: "12px" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={editStaffBusy}
                        className="btn pri"
                        style={{ padding: "7px 20px", fontSize: "12px" }}
                      >
                        {editStaffBusy ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* =========================================================================
              VIEW 4: DEDICATED SCREEN TO CONFIRM REMOVING A STAFF MEMBER
              ========================================================================= */}
            {staffView === "delete" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "2px solid #000000", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={handleCancelDeleteStaff}
                      disabled={deleteBusy}
                      className="btn"
                      style={{ padding: "4px 10px", fontSize: "12px", fontWeight: "700" }}
                    >
                      ← Back
                    </button>
                    <h3 style={{ fontSize: "15px", margin: 0, fontWeight: "800", textTransform: "uppercase" }}>
                      Remove Staff Member
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!deleteBusy) {
                        setStaffModalOpen(false);
                        setStaffToDelete(null);
                        setDeleteErr("");
                      }
                    }}
                    style={{ background: "transparent", border: "none", color: "var(--mute)", fontSize: "18px", cursor: "pointer", padding: "0 4px" }}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div style={{
                  background: "#fef2f2",
                  border: "2px solid #dc2626",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "16px",
                  boxShadow: "3px 3px 0px #000000",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      background: "#dc2626",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      flexShrink: 0,
                      border: "2px solid #000000",
                    }}>
                      ⚠️
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "13.5px", color: "#991b1b", marginBottom: "4px", textTransform: "uppercase" }}>
                        Immediate Access Revocation
                      </div>
                      <div style={{ fontSize: "13px", color: "#111827", lineHeight: 1.5 }}>
                        Are you sure you want to remove <strong>{staffToDelete?.name || staffToDelete?.email}</strong>
                        {staffToDelete?.name && staffToDelete?.email && staffToDelete.name !== staffToDelete.email ? ` (${staffToDelete.email})` : ""}?
                      </div>
                      <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: "8px", fontWeight: "700" }}>
                        This staff and their related data will be deleted immediately.
                      </div>
                    </div>
                  </div>
                </div>

                {deleteErr && (
                  <div className="err" style={{ marginBottom: "16px" }}>
                    {deleteErr}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={handleCancelDeleteStaff}
                    disabled={deleteBusy}
                    className="btn"
                    style={{ padding: "8px 18px", fontSize: "12.5px", fontWeight: "700" }}
                  >
                    No, Keep Staff
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteStaff}
                    disabled={deleteBusy}
                    className="btn"
                    style={{
                      padding: "8px 20px",
                      fontSize: "12.5px",
                      fontWeight: "800",
                      background: "#dc2626",
                      color: "#ffffff",
                      borderColor: "#000000",
                    }}
                  >
                    {deleteBusy ? "Deleting…" : "Yes, Delete Immediately"}
                  </button>
                </div>
              </div>
            )}
          </Modal>
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
                      <th style={{ textAlign: "left", padding: "8px 8px", fontSize: "12px", color: "#ffffff" }}>Rate Parameter</th>
                      <th style={{ textAlign: "left", padding: "8px 8px", fontSize: "12px", color: "#ffffff", width: "110px" }}>Value</th>
                      <th style={{ textAlign: "left", padding: "8px 8px", fontSize: "12px", color: "#ffffff" }}>Unit</th>
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
              {user?.role === "vendor" && (
                <div style={{ marginTop: "6px" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setProfileModalOpen(false);
                      handleOpenCompanySettings();
                    }}
                    style={{ width: "100%", justifyContent: "center", fontSize: "12px", gap: "6px" }}
                  >
                    <span>🏢</span> Edit Company Details
                  </button>
                </div>
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

        {/* Vendor Company Settings Modal */}
        {companySettingsModalOpen && (
          <Modal onDismiss={() => setCompanySettingsModalOpen(false)} style={{ width: "min(560px, 94vw)", maxWidth: "560px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px" }}>🏢</span>
                <div>
                  <h3 style={{ fontSize: "16px", margin: 0, fontWeight: "700" }}>Company Settings</h3>
                  <p className="note" style={{ margin: "2px 0 0", fontSize: "11.5px" }}>
                    Manage company details, factory address, and contact information.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompanySettingsModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--mute)", fontSize: "18px", cursor: "pointer", padding: "0 4px" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {companyLoading ? (
              <div style={{ padding: "28px 0", textAlign: "center", color: "var(--mute)", fontSize: "13px" }}>
                Loading company information…
              </div>
            ) : (
              <form onSubmit={handleSaveCompanySettings} style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "10px" }}>
                <label>
                  <span>
                    Company / Organization Name <span style={{ color: "var(--err, #ef4444)", marginLeft: "2px" }}>*</span>
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Corrugated Packaging Ltd"
                    value={companyForm.name}
                    onChange={e => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                    disabled={companySaving}
                  />
                </label>

                <div className="row" style={{ gap: "12px" }}>
                  <label style={{ flex: 1 }}>
                    Official Email
                    <input
                      type="email"
                      placeholder="sales@apexboxes.com"
                      value={companyForm.email}
                      onChange={e => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                      disabled={companySaving}
                    />
                  </label>
                  <label style={{ flex: 1 }}>
                    Contact / Phone Number
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={companyForm.contact}
                      onChange={e => setCompanyForm(prev => ({ ...prev, contact: e.target.value }))}
                      disabled={companySaving}
                    />
                  </label>
                </div>

                <label>
                  Plant / Office Address
                  <textarea
                    rows={3}
                    placeholder="Plot No., Industrial Area, City, State, PIN..."
                    value={companyForm.address}
                    onChange={e => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                    disabled={companySaving}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      fontFamily: "inherit",
                      fontSize: "13px",
                      padding: "8px 10px",
                      borderRadius: "4px",
                      border: "2px solid #000000",
                      boxShadow: "2px 2px 0px #000000",
                      boxSizing: "border-box",
                    }}
                  />
                </label>

                {companyMsg && (
                  <div style={{ background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "6px", padding: "8px 10px", fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>
                    ✓ {companyMsg}
                  </div>
                )}

                {companyErr && (
                  <div className="err" style={{ margin: 0 }}>
                    {companyErr}
                  </div>
                )}

                <div className="row" style={{ justifyContent: "flex-end", gap: "8px", marginTop: 8, borderTop: "1px solid var(--line-soft)", paddingTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setCompanySettingsModalOpen(false)}
                    disabled={companySaving}
                    style={{ flex: "none" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={companySaving}
                    className="btn pri"
                    style={{ flex: "none", padding: "6px 16px" }}
                  >
                    {companySaving ? "Saving…" : "Save Company Details"}
                  </button>
                </div>
              </form>
            )}
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
      </div>
    </div>
  );
}
