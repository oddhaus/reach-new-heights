"use client";

import { useState } from "react";

export default function BookingForm({ eventId, spotsLeft }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, name, phone, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch (err) {
      setErrorMsg("Couldn't reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="alert alert-success">
        You're booked, {name.split(" ")[0]}! See you there. 🎉
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {status === "error" && <div className="alert alert-error">{errorMsg}</div>}

      <div className="field">
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ama Owusu"
        />
      </div>

      <div className="field">
        <label htmlFor="phone">WhatsApp / phone number</label>
        <input
          id="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 024 123 4567"
        />
      </div>

      <div className="field">
        <label htmlFor="email">Email (optional)</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Booking..." : `Reserve my spot`}
      </button>
      <p className="helper-text" style={{ marginTop: 10 }}>
        {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
      </p>
    </form>
  );
}
