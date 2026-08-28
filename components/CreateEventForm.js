"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const initialState = {
  title: "",
  description: "",
  location: "",
  event_date: "",
  event_time: "",
  capacity: 20,
};

export default function CreateEventForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError("");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create event.");
        setStatus("error");
        return;
      }

      setForm(initialState);
      setStatus("idle");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setStatus("error");
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: 18 }}>
        New event
      </h2>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          required
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Saturday Sunrise HIIT"
        />
      </div>

      <div className="field">
        <label htmlFor="location">Location</label>
        <input
          id="location"
          value={form.location}
          onChange={(e) => update("location", e.target.value)}
          placeholder="e.g. Reach New Heights, Main Studio"
        />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="event_date">Date</label>
          <input
            id="event_date"
            type="date"
            required
            value={form.event_date}
            onChange={(e) => update("event_date", e.target.value)}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="event_time">Time</label>
          <input
            id="event_time"
            type="time"
            required
            value={form.event_time}
            onChange={(e) => update("event_time", e.target.value)}
          />
        </div>
        <div className="field" style={{ width: 110 }}>
          <label htmlFor="capacity">Capacity</label>
          <input
            id="capacity"
            type="number"
            min="1"
            required
            value={form.capacity}
            onChange={(e) => update("capacity", e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="description">Description (optional)</label>
        <textarea
          id="description"
          rows={3}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Anything members should know before booking"
        />
      </div>

      <button type="submit" className="btn btn-amber" disabled={status === "submitting"}>
        {status === "submitting" ? "Creating..." : "Create event"}
      </button>
    </form>
  );
}
