"use client";

import { useMemo, useState } from "react";

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "None";

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => (typeof item === "string" ? item : item?.name || item?.title || JSON.stringify(item))).join(", ") : "None";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatTimestamp(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toISOString().slice(0, 19).replace("T", " ");
}

export default function RegistrantDetailsModal({ bookings }) {
  const [selected, setSelected] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const normalizedBookings = useMemo(
    () => bookings.map((booking) => ({ ...booking, status: booking.status || "active" })),
    [bookings]
  );

  const filteredBookings = useMemo(
    () => normalizedBookings.filter((booking) => (statusFilter === "all" ? true : booking.status === statusFilter)),
    [normalizedBookings, statusFilter]
  );

  const current = useMemo(
    () => filteredBookings.find((booking) => booking.id === selected?.id) || null,
    [filteredBookings, selected]
  );

  async function handleCopyPhone() {
    if (!current?.phone) return;

    try {
      await navigator.clipboard.writeText(current.phone);
      setCopiedPhone(true);
      window.setTimeout(() => setCopiedPhone(false), 1200);
    } catch {
      setCopiedPhone(false);
    }
  }

  async function handleToggleStatus() {
    if (!current) return;
    const nextStatus = current.status === "suspended" ? "active" : "suspended";
    setUpdatingId(current.id);

    try {
      const response = await fetch(`/api/bookings/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Could not update registration status.");

      setSelected((prev) => ({ ...prev, status: nextStatus, suspended_at: nextStatus === "suspended" ? new Date().toISOString() : null }));
      window.location.reload();
    } catch (error) {
      window.alert(error.message || "Could not update registration status.");
    } finally {
      setUpdatingId(null);
    }
  }

  const fields = current
    ? [
        ["Name", current.name],
        ["Age", current.age],
        ["Phone", current.phone],
        ["Email", current.email || "Not provided"],
        ["Known health conditions", current.health_conditions],
        ["Food allergies / dietary restrictions", current.dietary_restrictions],
        ["Transport mode", current.transport_mode],
        ["Will carpool", current.carpool_willing],
        ["Carpool passengers", current.carpool_passengers],
        ["Selected activities", current.selected_activities],
        ["Payment policy accepted", current.payment_policy_accepted],
        ["Risk acknowledgement accepted", current.risk_acknowledgement_accepted],
        ["Booked on", current.created_at ? formatTimestamp(current.created_at) : "Unknown"],
      ]
    : [];

  return (
    <>
      <div className="form-card" style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Suspended", value: "suspended" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className="text-button"
              onClick={() => setStatusFilter(option.value)}
              style={{
                opacity: statusFilter === option.value ? 1 : 0.75,
                borderBottom: statusFilter === option.value ? "2px solid #f0c35a" : "2px solid transparent",
                borderRadius: 0,
                padding: "4px 0",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th>Booked</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.phone}</td>
                <td>{b.email || "—"}</td>
                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: b.status === "suspended" ? "rgba(255, 173, 66, 0.12)" : "rgba(64, 196, 119, 0.12)",
                      color: b.status === "suspended" ? "#f7c873" : "#9fe8b5",
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 0.08,
                    }}
                  >
                    {b.status === "suspended" ? "Suspended" : "Active"}
                  </span>
                </td>
                <td>{formatTimestamp(b.created_at)}</td>
                <td>
                  <button type="button" className="text-button" onClick={() => setSelected(b)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {current ? (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div
            className="login-modal"
            onClick={(event) => event.stopPropagation()}
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            <div className="modal-heading">
              <div>
                <p className="modal-eyebrow">Registrant</p>
                <h2>{current.name}</h2>
              </div>
              <button type="button" className="modal-close" aria-label="Close details" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 18 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: current.status === "suspended" ? "rgba(255, 173, 66, 0.12)" : "rgba(64, 196, 119, 0.12)",
                  border: `1px solid ${current.status === "suspended" ? "rgba(255, 173, 66, 0.6)" : "rgba(64, 196, 119, 0.6)"}`,
                  color: current.status === "suspended" ? "#f7c873" : "#9fe8b5",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.08,
                }}
              >
                {current.status === "suspended" ? "Suspended" : "Active"}
              </span>

              <button
                type="button"
                className="text-button"
                onClick={handleToggleStatus}
                disabled={updatingId === current.id}
                style={{
                  opacity: updatingId === current.id ? 0.7 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {updatingId === current.id ? "Updating..." : current.status === "suspended" ? "Restore booking" : "Suspend booking"}
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              {fields.map(([label, value]) => {
                if (label === "Phone") {
                  return (
                    <div key={label}>
                      <strong>{label}</strong>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <p className="modal-copy" style={{ margin: 0 }}>{formatValue(value)}</p>
                        <button
                          type="button"
                          aria-label="Copy phone number"
                          onClick={handleCopyPhone}
                          title={copiedPhone ? "Copied" : "Copy phone number"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.2)",
                            background: "rgba(255,255,255,0.04)",
                            color: "#f5f7ff",
                            cursor: "pointer",
                          }}
                        >
                          {copiedPhone ? "✓" : (
                            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="11" height="11" rx="2" />
                              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={label}>
                    <strong>{label}</strong>
                    <p className="modal-copy" style={{ margin: "6px 0 0" }}>{formatValue(value)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
