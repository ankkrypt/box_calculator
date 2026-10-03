"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPasswordWithToken } from "../../auth-client";

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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const role = searchParams.get("role") || "vendor";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!token) {
      setErr("Reset token is missing or invalid. Please request a new link.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Passwords do not match. Please re-enter.");
      return;
    }

    setBusy(true);
    try {
      await resetPasswordWithToken({ token, role, password });
      setSuccess(true);
    } catch (x) {
      setErr(x.message || "Failed to reset password. The link may have expired.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="card authcard">
        <h2>Password Reset Successfully ✅</h2>
        <p className="note">
          Your {role} password has been updated. You can now log in using your new password.
        </p>
        <Link className="btn pri" href="/auth" style={{ marginTop: "12px", textAlign: "center" }}>
          Go to Login →
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="card authcard">
        <h2>Invalid Reset Link ⚠️</h2>
        <p className="note">
          No password reset token was provided in the URL. Please request a new reset link from the login page.
        </p>
        <Link className="btn pri" href="/auth" style={{ marginTop: "12px", textAlign: "center" }}>
          ← Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="card authcard">
      <h2>Create New Password</h2>
      <p className="note">
        Setting new password for your <b>{role}</b> account.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
        <div>
          <label style={{ marginBottom: "4px" }}>New Password <span className="note">(min 8 characters)</span></label>
          <div className="pwd-wrap">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
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

        <div>
          <label style={{ marginBottom: "4px" }}>Confirm New Password</label>
          <div className="pwd-wrap">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="pwd-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              title={showConfirmPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon visible={showConfirmPassword} />
            </button>
          </div>
        </div>

        <p className="err">{err}</p>

        <button className="pri" type="submit" disabled={busy}>
          {busy ? "Saving password…" : "Reset Password"}
        </button>

        <p className="note" style={{ textAlign: "center", marginTop: "8px" }}>
          Remember your password? <Link className="link-btn" href="/auth">Log in</Link>
        </p>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="authwrap">
      <h1>BoxCalc</h1>
      <Suspense fallback={<div className="card authcard"><p className="note">Loading reset form…</p></div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
