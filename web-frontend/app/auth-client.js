/* Frontend ↔ backend auth client.
   Access token: short-lived JWT, kept in localStorage, sent as `Authorization: Bearer <token>`.
   Refresh token: long-lived secret, httpOnly cookie managed by the server. */

export function getApiUrl() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // When accessed from a phone or other device on the LAN (e.g. 192.168.0.235)
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `${window.location.protocol}//${host}:5000`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
}

const TOKEN_KEY = "bxcalc.accessToken";
const USER_KEY = "bxcalc.user";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
}

/* Validates whether a JWT token string has not expired */
export function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Require at least 15s remaining lifetime
    return Boolean(payload && payload.exp && payload.exp * 1000 > Date.now() + 15000);
  } catch {
    return false;
  }
}

/* Concurrent refresh promise deduplication */
let inFlightRefresh = null;

export async function refresh() {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(3500) : undefined,
      });

      if (!res.ok) {
        setToken(null);
        setStoredUser(null);
        return false;
      }

      const data = await res.json();
      setToken(data.accessToken);
      if (data.user) setStoredUser(data.user);
      return true;
    } catch {
      return false;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

/* Fetch wrapper: attaches Bearer token, auto-refreshes once on 401 */
export async function api(path, { method = "GET", body, headers, retry = true } = {}) {
  const token = getToken();
  const res = await fetch(`${getApiUrl()}${path}`, {
    method,
    credentials: "include",
    signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401 && retry && getToken()) {
    const ok = await refresh();
    if (ok) return api(path, { method, body, headers, retry: false });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/* Clear all client tokens and tell server to clear the httpOnly cookie */
export function clearAuthSession() {
  setToken(null);
  setStoredUser(null);
  try {
    // Non-blocking fire to revoke token and clear httpOnly cookie
    fetch(`${getApiUrl()}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  } catch {
    // Ignore network errors
  }
}

/* Logout */
export async function logout() {
  clearAuthSession();
}

/* Fast session validator */
export async function getCurrentUser() {
  const stored = getStoredUser();
  const token = getToken();

  // 1. If stored user exists and access token is still fresh, return immediately (0ms)
  if (stored && isTokenValid(token)) {
    return stored;
  }

  // 2. Token is expired or missing: try single unified refresh via httpOnly cookie
  const ok = await refresh();
  if (ok) {
    return getStoredUser();
  }

  return null;
}

/* Vendor Authentication */
export async function loginVendor(email, password) {
  const data = await api("/api/auth/vendor/login", {
    method: "POST",
    body: { email, password },
  });
  setToken(data.accessToken);
  setStoredUser(data.user);
  return data.user;
}

export async function signupVendor(payload) {
  const data = await api("/api/auth/vendor/signup", {
    method: "POST",
    body: payload,
  });
  setToken(data.accessToken);
  setStoredUser(data.user);
  return data.user;
}

/* Staff Authentication */
export async function loginStaff(email, password) {
  const data = await api("/api/auth/staff/login", {
    method: "POST",
    body: { email, password },
  });
  setToken(data.accessToken);
  setStoredUser(data.user);
  return data.user;
}

/* Password Reset Flows */
export async function forgotPassword(email, role = "vendor") {
  return api(`/api/auth/${role}/forgot-password`, {
    method: "POST",
    body: { email },
  });
}

export async function resetPasswordWithToken({ token, role = "vendor", password }) {
  return api(`/api/auth/${role}/reset-password-token`, {
    method: "POST",
    body: { token, password },
  });
}

/* Staff Management (Vendor Only) */
export async function inviteStaff({ email, name }) {
  return api("/api/auth/vendor/invite-staff", {
    method: "POST",
    body: { email, name },
  });
}

export async function getStaffList() {
  const data = await api("/api/auth/vendor/staff");
  return data?.staff || [];
}

export async function removeStaff(id) {
  return api(`/api/auth/vendor/remove-staff/${id}`, {
    method: "DELETE",
  });
}

/* Quotation Rates & Settings (stored in Quotation model) */
export async function getQuotation() {
  return api("/api/quotation");
}

export async function updateQuotation({ conversion, profitMargin, tax, discount, conv, marg }) {
  return api("/api/quotation", {
    method: "PUT",
    body: { conversion, profitMargin, tax, discount, conv, marg },
  });
}

// Aliases for compatibility
export async function getVendorPricingSettings() {
  return getQuotation();
}

export async function updateVendorPricingSettings(payload) {
  return updateQuotation(payload);
}

/* Packaging Calculation Engine */
export async function calculateAndSaveQuotation({ order, board, pricing }) {
  return api("/api/quotation/calculate", {
    method: "POST",
    body: { order, board, pricing },
  });
}

export async function getLatestQuotation() {
  return api("/api/quotation/latest");
}

/* ==========================================================================
   CONFIRMED ORDERS & ORDER HISTORY API
   ========================================================================== */
export async function confirmOrder({ order, board, pricing }) {
  return api("/api/orders", {
    method: "POST",
    body: { order, board, pricing },
  });
}

export async function getOrders() {
  const data = await api("/api/orders");
  return data?.orders || [];
}

/* ==========================================================================
   REEL INVENTORY API
   ========================================================================== */
export async function getReels() {
  const data = await api("/api/reels");
  return data?.reels || [];
}

export async function createReel(payload) {
  const data = await api("/api/reels", {
    method: "POST",
    body: payload,
  });
  return data?.reel;
}

export async function updateReel(id, payload) {
  const data = await api(`/api/reels/${id}`, {
    method: "PUT",
    body: payload,
  });
  return data?.reel;
}

export async function deleteReel(id) {
  return api(`/api/reels/${id}`, {
    method: "DELETE",
  });
}

export async function bulkDeleteReels(ids) {
  return api("/api/reels/bulk-delete", {
    method: "POST",
    body: { ids },
  });
}

/* ==========================================================================
   FLUTE TABLE API
   ========================================================================== */
export async function getFlutes() {
  const data = await api("/api/flutes");
  return data?.flutes || [];
}

export async function createFlute(payload) {
  const data = await api("/api/flutes", {
    method: "POST",
    body: payload,
  });
  return data?.flute;
}

export async function updateFlute(id, payload) {
  const data = await api(`/api/flutes/${id}`, {
    method: "PUT",
    body: payload,
  });
  return data?.flute;
}

export async function deleteFlute(id) {
  return api(`/api/flutes/${id}`, {
    method: "DELETE",
  });
}

export async function bulkDeleteFlutes(ids) {
  return api("/api/flutes/bulk-delete", {
    method: "POST",
    body: { ids },
  });
}

export async function resetFlutes() {
  const data = await api("/api/flutes/reset", {
    method: "POST",
  });
  return data?.flutes || [];
}

/* ==========================================================================
   SCORE TOLERANCE API
   ========================================================================== */
export async function getScoreTolerances() {
  const data = await api("/api/tolerances");
  return data?.tolerances || {};
}

export async function updateScoreTolerances(tolerances) {
  const data = await api("/api/tolerances", {
    method: "PUT",
    body: { tolerances },
  });
  return data?.tolerances;
}

export async function resetScoreTolerances() {
  const data = await api("/api/tolerances/reset", {
    method: "POST",
  });
  return data?.tolerances;
}

/* ==========================================================================
   PAPER GRADES API
   ========================================================================== */
export async function getPaperGrades() {
  const data = await api("/api/papers");
  return data?.papers || [];
}

export async function createPaperGrade(payload) {
  const data = await api("/api/papers", {
    method: "POST",
    body: payload,
  });
  return data?.paper;
}

export async function updatePaperGrade(id, payload) {
  const data = await api(`/api/papers/${id}`, {
    method: "PUT",
    body: payload,
  });
  return data?.paper;
}

export async function deletePaperGrade(id) {
  return api(`/api/papers/${id}`, {
    method: "DELETE",
  });
}

export async function bulkDeletePaperGrades(ids) {
  return api("/api/papers/bulk-delete", {
    method: "POST",
    body: { ids },
  });
}

export async function resetPaperGrades() {
  const data = await api("/api/papers/reset", {
    method: "POST",
  });
  return data?.papers || [];
}
