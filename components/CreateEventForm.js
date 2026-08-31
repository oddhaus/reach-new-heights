"use client";

import { useEffect, useState } from "react";
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
  base_price: "",
};

const emptyActivity = { name: "", price: "" };

export default function CreateEventForm({ categories, existingEvent = null, mode = "create" }) {
  const router = useRouter();
  const [form, setForm] = useState(() => {
    const baseValues = existingEvent ? {
      title: existingEvent.title || "",
      category_id: existingEvent.category_id || "",
      difficulty: existingEvent.difficulty || "All Levels",
      short_description: existingEvent.short_description || "",
      full_description: existingEvent.full_description || "",
      image: null,
      location: existingEvent.location || "",
      address: existingEvent.address || "",
      meeting_instructions: existingEvent.meeting_instructions || "",
      event_date: existingEvent.event_date || "",
      event_time: existingEvent.event_time || "",
      event_end_time: existingEvent.event_end_time || "",
      capacity: existingEvent.capacity || 20,
      base_price: existingEvent.base_price ?? "",
    } : initialState;

    return baseValues;
  });
  const [activities, setActivities] = useState(() => {
    if (!existingEvent || !Array.isArray(existingEvent.extra_activities) || existingEvent.extra_activities.length === 0) {
      return [{ ...emptyActivity }];
    }

    return existingEvent.extra_activities.map((activity) => ({
      name: activity.name || "",
      price: activity.price ?? "",
    }));
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);

    if (!existingEvent) {
      setForm(initialState);
      setActivities([{ ...emptyActivity }]);
      return;
    }

    setForm({
      title: existingEvent.title || "",
      category_id: existingEvent.category_id || "",
      difficulty: existingEvent.difficulty || "All Levels",
      short_description: existingEvent.short_description || "",
      full_description: existingEvent.full_description || "",
      image: null,
      location: existingEvent.location || "",
      address: existingEvent.address || "",
      meeting_instructions: existingEvent.meeting_instructions || "",
      event_date: existingEvent.event_date || "",
      event_time: existingEvent.event_time || "",
      event_end_time: existingEvent.event_end_time || "",
      capacity: existingEvent.capacity || 20,
      base_price: existingEvent.base_price ?? "",
    });
    setActivities(
      Array.isArray(existingEvent.extra_activities) && existingEvent.extra_activities.length > 0
        ? existingEvent.extra_activities.map((activity) => ({
            name: activity.name || "",
            price: activity.price ?? "",
          }))
        : [{ ...emptyActivity }]
    );
  }, [existingEvent]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateActivity(index, field, value) {
    setActivities((current) =>
      current.map((activity, activityIndex) =>
        activityIndex === index ? { ...activity, [field]: value } : activity
      )
    );
  }

  function addActivity() {
    setActivities((current) => [...current, { ...emptyActivity }]);
  }

  function removeActivity(index) {
    setActivities((current) => {
      if (current.length === 1) return [{ ...emptyActivity }];
      return current.filter((_, activityIndex) => activityIndex !== index);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError("");

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== "") payload.append(key, value);
      });

      const normalizedActivities = activities
        .map((activity) => ({
          name: String(activity.name || "").trim(),
          price: String(activity.price || "").trim(),
        }))
        .filter((activity) => activity.name || activity.price)
        .map((activity) => ({
          name: activity.name,
          price: Number.parseFloat(activity.price || "0"),
        }))
        .filter((activity) => activity.name && Number.isFinite(activity.price) && activity.price >= 0);

      payload.append("extra_activities", JSON.stringify(normalizedActivities));

      const url = existingEvent ? `/api/events/${existingEvent.id}` : "/api/events";
      const method = existingEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: payload,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create event.");
        setStatus("error");
        return;
      }

      if (!existingEvent) {
        setForm(initialState);
        setActivities([{ ...emptyActivity }]);
        setStatus("idle");
        setIsOpen(false);
      } else {
        setStatus("idle");
        setIsOpen(false);
      }
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
          <strong>{existingEvent ? "Edit event" : "Create new event"}</strong>
          <small>{existingEvent ? "Update your event details" : "Add a session, image, and booking details"}</small>
        </span>
      </button>
    );
  }

  return (
    <form className="form-card create-event-form" onSubmit={handleSubmit}>
      <div className="create-event-heading">
        <div>
          <p className="section-kicker">Event setup</p>
          <h2>{existingEvent ? "Edit event" : "New event"}</h2>
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
        <label htmlFor="base_price">Main event price</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #d9d1c5", borderRadius: 12, background: "#fff", padding: "0 12px" }}>
          <span aria-hidden="true">GH₵</span>
          <input
            id="base_price"
            type="number"
            min="0"
            step="0.01"
            value={form.base_price}
            onChange={(e) => update("base_price", e.target.value)}
            placeholder="0.00"
            style={{ border: "none", outline: "none", width: "100%", padding: "12px 0" }}
          />
        </div>
      </div>

      <div className="field">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <label>Extra activities</label>
          <button type="button" className="text-button" onClick={addActivity}>+ Add activity</button>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          {activities.map((activity, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr) auto", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                value={activity.name}
                onChange={(e) => updateActivity(index, "name", e.target.value)}
                placeholder="e.g. Trail lunch"
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #d9d1c5", borderRadius: 12, background: "#fff", padding: "0 12px" }}>
                <span aria-hidden="true">GH₵</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={activity.price}
                  onChange={(e) => updateActivity(index, "price", e.target.value)}
                  placeholder="0.00"
                  style={{ border: "none", outline: "none", width: "100%", padding: "12px 0" }}
                />
              </div>
              <button type="button" className="text-button" onClick={() => removeActivity(index)}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <p className="helper-text">Optional upsells like gear rental, a picnic, or guide tips.</p>
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
        {status === "submitting" ? (existingEvent ? "Updating..." : "Creating...") : (existingEvent ? "Update event" : "Create event")}
      </button>
    </form>
  );
}
