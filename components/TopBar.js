"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TopBar({ tag, isAdmin = false }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function openDialog() {
    setError("");
    setPassword("");
    setIsOpen(true);
  }

  function closeDialog() {
    if (!loading) setIsOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <img src="/logo.png" alt="Reach New Heights" className="brand-logo" />
          </Link>
          <div className="topbar-actions">
            {isAdmin ? (
              <button type="button" className="admin-access icon-button" onClick={handleLogout} aria-label="Log out" title="Log out">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10" />
                  <path d="M14 8l4 4-4 4M18 12H9" />
                </svg>
              </button>
            ) : (
              <button type="button" className="admin-access icon-button" onClick={openDialog} aria-label="Admin login" title="Admin login">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3l7 3v5c0 4.6-3 8.5-7 10-4-1.5-7-5.4-7-10V6l7-3Z" />
                  <path d="M9.5 12h5M12 9.5v5" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {isOpen ? (
        <div className="modal-backdrop" onMouseDown={closeDialog}>
          <section
            className="login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-login-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="modal-eyebrow">Restricted area</p>
                <h2 id="admin-login-title">Admin access</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeDialog}
                aria-label="Close admin login"
                disabled={loading}
              >
                &times;
              </button>
            </div>

            <p className="modal-copy">Enter the admin password to manage events and bookings.</p>
            <form onSubmit={handleSubmit}>
              {error ? <div className="alert alert-error">{error}</div> : null}
              <div className="field">
                <label htmlFor="topbar-admin-password">Password</label>
                <input
                  id="topbar-admin-password"
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Checking..." : "Continue to admin"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
