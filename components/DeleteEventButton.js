"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteEventButton({ eventId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this event and all its bookings? This can't be undone."
    );
    if (!confirmed) return;

    setLoading(true);
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setLoading(false);
      alert("Couldn't delete this event. Try again.");
    }
  }

  return (
    <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
      {loading ? "Deleting..." : "Delete event"}
    </button>
  );
}
