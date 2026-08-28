"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const initialState = {
  title: "",
  category_id: "",
  difficulty: "All Levels",
  short_description: "",
  full_description: "",
  image: null,
  location: "",
  address: "",
  meeting_instructions: "",
  event_date: "",
  event_time: "",
  event_end_time: "",
  capacity: 20,
};

export default function CreateEventForm({ categories }) {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

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
        body: (() => {
          const payload = new FormData();
          Object.entries(form).forEach(([key, value]) => {
            if (value !== null && value !== "") payload.append(key, value);
          });
          return payload;
        })(),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create event.");
        setStatus("error");
        return;
      }

      setForm(initialState);
      setStatus("idle");
      setIsOpen(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setStatus("error");
    }
  }

  if (!isOpen) {
    return (
      <button type="button" className="create-event-trigger" onClick={() => setIsOpen(true)}>
        <span className="create-event-plus" aria-hidden="true">+</span>
        <span>
          <strong>Create new event</strong>
          <small>Add a session, image, and booking details</small>
        </span>
      </button>
    );
  }

  return (
    <form className="form-card create-event-form" onSubmit={handleSubmit}>
      <div className="create-event-heading">
        <div>
          <p className="section-kicker">Event setup</p>
          <h2>New event</h2>
        </div>
        <button type="button" className="text-button" onClick={() => setIsOpen(false)}>Close</button>
      </div>
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
        <label htmlFor="category_id">Category</label>
        <select id="category_id" value={form.category_id} onChange={(e) => update("category_id", e.target.value)} required>
          <option value="">Select a category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="location">Location name</label>
        <input
          id="location"
          value={form.location}
          onChange={(e) => update("location", e.target.value)}
          placeholder="e.g. Reach New Heights, Main Studio"
        />
      </div>

      <div className="event-schedule-fields">
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
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="event_end_time">End time</label>
          <input id="event_end_time" type="time" value={form.event_end_time} onChange={(e) => update("event_end_time", e.target.value)} />
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
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="difficulty">Difficulty</label>
          <select id="difficulty" value={form.difficulty} onChange={(e) => update("difficulty", e.target.value)}>
            <option>All Levels</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="address">Address</label>
        <input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="e.g. Trailhead Lot #2, Angeles National Forest, CA" />
      </div>

      <div className="field">
        <label htmlFor="meeting_instructions">Meeting point instructions</label>
        <input id="meeting_instructions" value={form.meeting_instructions} onChange={(e) => update("meeting_instructions", e.target.value)} placeholder="e.g. Look for the cyan canopy at the trailhead gate." />
      </div>

      <div className="field">
        <label htmlFor="short_description">Short description</label>
        <textarea id="short_description" rows={2} value={form.short_description} onChange={(e) => update("short_description", e.target.value)} placeholder="One sentence overview for cards" />
      </div>

      <div className="field">
        <label htmlFor="full_description">Full description</label>
        <textarea id="full_description" rows={4} value={form.full_description} onChange={(e) => update("full_description", e.target.value)} placeholder="Detailed breakdown of workout and benefits" />
      </div>

      <div className="field">
        <label htmlFor="image">Event image (optional)</label>
        <input
          id="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => update("image", e.target.files?.[0] || null)}
        />
        <p className="helper-text">JPG, PNG, or WebP up to 5 MB.</p>
      </div>

      <button type="submit" className="btn btn-amber" disabled={status === "submitting"}>
        {status === "submitting" ? "Creating..." : "Create event"}
      </button>
    </form>
  );
}
