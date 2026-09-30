/* Frontend ↔ backend auth client.
   Access token: short-lived JWT, kept in localStorage, sent as `Authorization: Bearer <token>`.
   Refresh token: long-lived secret, httpOnly cookie managed by the server. */

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
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
      const res = await fetch(`${API}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
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
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: "include",
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
    fetch(`${API}/api/auth/logout`, {
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
