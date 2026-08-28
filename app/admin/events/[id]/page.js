import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatEventDate, formatEventTime } from "@/lib/format";
import TopBar from "@/components/TopBar";
import DeleteEventButton from "@/components/DeleteEventButton";
import ShareLinkButton from "@/components/ShareLinkButton";

export const revalidate = 0;

export default async function AdminEventPage({ params }) {
  if (!isAdminRequest()) {
    redirect("/admin/login");
  }

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!event) notFound();

  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("id, name, phone, email, created_at")
    .eq("event_id", params.id)
    .order("created_at", { ascending: true });

  const list = bookings || [];

  return (
    <>
      <TopBar tag="Admin dashboard" />
      <main className="container">
        <Link href="/admin" className="back-link">
          &larr; All events
        </Link>

        <span className="event-date-chip">
          {formatEventDate(event.event_date)} &middot; {formatEventTime(event.event_time)}
        </span>
        <h1 className="hero-heading">{event.title}</h1>
        <p className="hero-sub">
          {event.location} &middot; {list.length} / {event.capacity} booked
        </p>

        <div className="btn-row" style={{ marginBottom: 24 }}>
          <ShareLinkButton eventId={event.id} title={event.title} />
          <DeleteEventButton eventId={event.id} />
        </div>

        <h2 className="section-heading" style={{ marginTop: 0 }}>
          Registrants
        </h2>

        {list.length === 0 ? (
          <div className="empty-state">No bookings yet.</div>
        ) : (
          <div className="form-card" style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Booked</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>{b.phone}</td>
                    <td>{b.email || "—"}</td>
                    <td>{new Date(b.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
