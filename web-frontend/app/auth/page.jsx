"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  loginVendor,
  loginStaff,
  signupVendor,
  forgotPassword,
  getCurrentUser,
  getStoredUser,
  getToken,
} from "../auth-client";

/* Eye icon toggle for password visibility */
function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [role, setRole] = useState("vendor"); // "vendor" | "staff"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Forgot password box state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotUrl, setForgotUrl] = useState("");

  // Redirect to root if already logged in and verified
  useEffect(() => {
    let mounted = true;
    async function checkExisting() {
      if (!getStoredUser() && !getToken()) return;
      const u = await getCurrentUser();
      if (mounted && u) {
        router.replace("/");
      }
    }
    checkExisting();
    return () => {
      mounted = false;
    };
  }, [router]);

  function switchMode(newMode) {
    setMode(newMode);
    setShowForgot(false);
    setErr("");
    setPassword("");
  }

  function switchRole(newRole) {
    setRole(newRole);
    setErr("");
    setPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");

    try {
      if (mode === "login") {
        if (role === "vendor") {
          await loginVendor(email.trim(), password);
        } else {
          await loginStaff(email.trim(), password);
        }
      } else {
        await signupVendor({
          name: name.trim(),
          vendorName: vendorName.trim(),
          email: email.trim(),
          password,
        });
      }
      // Redirect to root page once authenticated
      router.push("/");
    } catch (x) {
      setErr(x.message || "Authentication failed");
      setBusy(false);
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setForgotMsg("");
    setForgotUrl("");

    try {
      const res = await forgotPassword(forgotEmail.trim(), role);
      setForgotMsg(res.message || "Reset link sent!");
      if (res.resetUrl) setForgotUrl(res.resetUrl);
    } catch (x) {
      setErr(x.message || "Failed to request password reset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authwrap">
      <h1>BoxCalc</h1>

      {showForgot ? (
        /* Reset Password Box */
        <div className="card authcard">
          <h2>Reset Password</h2>
          <p className="note">
            Enter your {role} email address below. We will send a secure link to reset your password.
          </p>

          {forgotMsg ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
              <p style={{ color: "#2e7d32", fontSize: "13px", fontWeight: "500", margin: 0 }}>
                ✅ {forgotMsg}
              </p>
              {forgotUrl && (
                <div style={{ background: "var(--soft)", padding: "10px", borderRadius: "6px" }}>
                  <p className="note" style={{ margin: "0 0 6px" }}>
                    <b>Development Reset Link:</b>
                  </p>
                  <Link className="link-btn" href={forgotUrl}>
                    Click here to open Reset Password page →
                  </Link>
                </div>
              )}
              <button
                type="button"
                className="pri"
                onClick={() => {
                  setShowForgot(false);
                  setForgotMsg("");
                  setForgotUrl("");
                }}
                style={{ marginTop: "6px" }}
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label>
                {role === "vendor" ? "Vendor Email" : "Staff Email"}
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </label>

              <p className="err">{err}</p>

              <button className="pri" type="submit" disabled={busy}>
                {busy ? "Sending link…" : "Send Reset Link"}
              </button>

              <button
                type="button"
                className="link-btn"
                onClick={() => setShowForgot(false)}
                style={{ textAlign: "center", marginTop: "4px" }}
              >
                ← Back to Login
              </button>
            </form>
          )}
        </div>
      ) : (
        /* Standard Auth Card */
        <div className="card authcard">
          {/* Top-Level Tabs: Login / Sign up */}
          <div className="tabs">
            <button
              type="button"
              className="tab"
              aria-selected={mode === "login"}
              onClick={() => switchMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              className="tab"
              aria-selected={mode === "signup"}
              onClick={() => switchMode("signup")}
            >
              Sign up
            </button>
          </div>

          {/* Login Mode: Sub-Tabs for Vendor vs Staff */}
          {mode === "login" && (
            <div className="subtabs">
              <button
                type="button"
                className={`subtab ${role === "vendor" ? "active" : ""}`}
                onClick={() => switchRole("vendor")}
              >
                Vendor
              </button>
              <button
                type="button"
                className={`subtab ${role === "staff" ? "active" : ""}`}
                onClick={() => switchRole("staff")}
              >
                Staff
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {mode === "signup" && (
              <>
                <label>
                  Your Name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Priya Sharma"
                    autoComplete="name"
                  />
                </label>
                <label>
                  Company / Vendor Name
                  <input
                    required
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Acme Packaging"
                    autoComplete="organization"
                  />
                </label>
              </>
            )}

            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </label>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ margin: 0 }}>
                  Password {mode === "signup" && <span className="note">(min 8 characters)</span>}
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgot(true);
                      setForgotMsg("");
                      setForgotUrl("");
                      setErr("");
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="pwd-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {mode === "login" && role === "staff" && (
              <p className="note">
                Invited staff: your initial password is your invited email address.
              </p>
            )}

            {mode === "signup" && (
              <p className="note">
                Staff accounts cannot self-register; they are invited by their vendor admin.
              </p>
            )}

            <p className="err">{err}</p>

            <button className="pri" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "login" ? `Log in as ${role}` : "Create Vendor Account"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
